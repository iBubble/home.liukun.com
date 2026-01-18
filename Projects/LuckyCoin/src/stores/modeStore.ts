import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mode } from '../styles/colors';

interface ModeState {
  mode: Mode;
  isTransitioning: boolean;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  setTransitioning: (isTransitioning: boolean) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: 'reality',
      isTransitioning: false,
      
      setMode: (mode) => {
        set({ mode, isTransitioning: true });
        setTimeout(() => set({ isTransitioning: false }), 500);
      },
      
      toggleMode: () => {
        const currentMode = get().mode;
        const newMode = currentMode === 'dream' ? 'reality' : 'dream';
        get().setMode(newMode);
      },
      
      setTransitioning: (isTransitioning) => set({ isTransitioning }),
    }),
    {
      name: 'lucky-coin-mode',
    }
  )
);
