import { create } from "zustand";

interface WizardState {
  // Step 1: Genre
  genreId: string | null;
  customTopic: string | null;

  // Step 2: Visual Style & Preset
  visualStyleId: string | null;
  presetId: string | null;
  qualityOptionId: string | null;

  // Step 3: Voice & Music
  voiceId: string | null;
  musicId: string | null;

  // Step 4: Video Settings
  aspectRatio: string; // "9:16" | "1:1" | "16:9"
  duration: number; // 15 | 30 | 45 | 60
  emphasisWords: boolean;
  fastCuts: boolean;
  autoEffects: boolean;
  autoCaptions: boolean;

  // Wizard navigation
  currentStep: number;

  // Estimated cost
  estimatedCredits: number;

  // Actions
  setGenre: (genreId: string | null) => void;
  setCustomTopic: (topic: string | null) => void;
  setVisualStyle: (styleId: string | null) => void;
  setPreset: (presetId: string | null) => void;
  setQuality: (qualityId: string | null) => void;
  setVoice: (voiceId: string | null) => void;
  setMusic: (musicId: string | null) => void;

  updateSettings: (settings: Partial<{
    aspectRatio: string;
    duration: number;
    emphasisWords: boolean;
    fastCuts: boolean;
    autoEffects: boolean;
    autoCaptions: boolean;
  }>) => void;

  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
  calculateCredits: () => void;
}

const initialState = {
  genreId: null,
  customTopic: null,
  visualStyleId: null,
  presetId: null,
  qualityOptionId: null,
  voiceId: null,
  musicId: null,
  aspectRatio: "9:16",
  duration: 30,
  emphasisWords: true,
  fastCuts: false,
  autoEffects: true,
  autoCaptions: true,
  currentStep: 1,
  estimatedCredits: 0,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setGenre: (genreId) => {
    set({ genreId });
  },

  setCustomTopic: (customTopic) => {
    set({ customTopic });
  },

  setVisualStyle: (visualStyleId) => {
    // Reset preset and quality when style changes
    set({ visualStyleId, presetId: null, qualityOptionId: null });
    get().calculateCredits();
  },

  setPreset: (presetId) => {
    set({ presetId });
  },

  setQuality: (qualityOptionId) => {
    set({ qualityOptionId });
    get().calculateCredits();
  },

  setVoice: (voiceId) => {
    set({ voiceId });
  },

  setMusic: (musicId) => {
    set({ musicId });
  },

  updateSettings: (newSettings) => {
    set((state) => ({ ...state, ...newSettings }));
    get().calculateCredits();
  },

  setCurrentStep: (step) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 4) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  resetWizard: () => {
    set(initialState);
  },

  calculateCredits: () => {
    const { visualStyleId, qualityOptionId, duration } = get();
    let baseCredits = 2;

    // Quality tier base credits
    if (qualityOptionId === 'standard') baseCredits = 2;
    else if (qualityOptionId === 'premium') baseCredits = 5;
    else if (qualityOptionId === 'ultra_premium') baseCredits = 12;

    // Visual style multiplier
    if (visualStyleId === 'cinematic_video') {
      baseCredits = Math.ceil(baseCredits * 2);
    } else if (visualStyleId === 'stock_default') {
      baseCredits = Math.max(1, Math.ceil(baseCredits * 0.5));
    }

    // Duration multiplier (baseline 15s)
    if (duration > 15) {
      baseCredits = Math.ceil(baseCredits * (duration / 15));
    }

    set({ estimatedCredits: baseCredits });
  },
}));
