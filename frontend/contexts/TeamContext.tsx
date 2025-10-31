import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface PlayerStats {
  matches: number;
  sets: number;
  kills_per_set: number;
  digs_per_set: number;
  blocks_per_set: number;
  aces_per_set: number;
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  teamName: string;
  creditCost: number;
  bio: string;
  imageBase64: string;
  stats: PlayerStats;
}

interface Lineup {
  setter: Player | null;
  outsideHitter: Player | null;
  oppositeHitter: Player | null;
  middleBlocker: Player | null;
  libero: Player | null;
  defensiveSpecialist: Player | null;
  creditsUsed: number;
  remaining: number;
}

interface TeamContextType {
  lineup: Lineup;
  setPlayerToPosition: (position: keyof Lineup, player: Player | null) => void;
  saveLineup: () => Promise<void>;
  loadLineup: () => Promise<void>;
  saving: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  const [lineup, setLineup] = useState<Lineup>({
    setter: null,
    outsideHitter: null,
    oppositeHitter: null,
    middleBlocker: null,
    libero: null,
    defensiveSpecialist: null,
    creditsUsed: 0,
    remaining: 100,
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadLineup();
    }
  }, [user]);

  const calculateCredits = (newLineup: Lineup) => {
    const positions: (keyof Lineup)[] = ['setter', 'outsideHitter', 'oppositeHitter', 'middleBlocker', 'libero', 'defensiveSpecialist'];
    let total = 0;
    positions.forEach(pos => {
      const player = newLineup[pos];
      if (player && typeof player === 'object' && 'creditCost' in player) {
        total += player.creditCost;
      }
    });
    return { creditsUsed: total, remaining: 100 - total };
  };

  const setPlayerToPosition = (position: keyof Lineup, player: Player | null) => {
    const newLineup = { ...lineup, [position]: player };
    const credits = calculateCredits(newLineup);
    setLineup({ ...newLineup, ...credits });
  };

  const saveLineup = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const body = {
        setter: lineup.setter?.id || null,
        outsideHitter: lineup.outsideHitter?.id || null,
        oppositeHitter: lineup.oppositeHitter?.id || null,
        middleBlocker: lineup.middleBlocker?.id || null,
        libero: lineup.libero?.id || null,
        defensiveSpecialist: lineup.defensiveSpecialist?.id || null,
      };

      const response = await fetch(`${BACKEND_URL}/api/lineup/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save lineup');
      }
    } finally {
      setSaving(false);
    }
  };

  const loadLineup = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/lineup`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLineup({
          setter: data.setter,
          outsideHitter: data.outsideHitter,
          oppositeHitter: data.oppositeHitter,
          middleBlocker: data.middleBlocker,
          libero: data.libero,
          defensiveSpecialist: data.defensiveSpecialist,
          creditsUsed: data.creditsUsed || 0,
          remaining: data.remaining || 100,
        });
      }
    } catch (error) {
      console.error('Failed to load lineup:', error);
    }
  };

  return (
    <TeamContext.Provider value={{ lineup, setPlayerToPosition, saveLineup, loadLineup, saving }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
