/**
 * Theme Store - Manages theme colors and physics settings
 * 
 * Replaces useTheme hook with Zustand for consistency
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  nodeGlow: string;
  linkColor: string;
  canvasBackground: string;
  folderNodeColor: string;
  fileNodeColor: string;
}

interface PhysicsSettings {
  chargeStrength: number;
  linkDistance: number;
  velocityDecay: number;
  alphaDecay: number;
}

interface Theme {
  colors: ThemeColors;
  physics: PhysicsSettings;
}

const defaultTheme: Theme = {
  colors: {
    primary: '270 70% 65%',
    accent: '270 80% 70%',
    background: '240 15% 5%',
    foreground: '240 10% 95%',
    nodeGlow: '270 80% 70%',
    linkColor: '270 70% 65%',
    canvasBackground: '240 15% 8%',
    folderNodeColor: '48 100% 60%',
    fileNodeColor: '270 70% 65%',
  },
  physics: {
    chargeStrength: -300,
    linkDistance: 100,
    velocityDecay: 0.3,
    alphaDecay: 0.02,
  },
};

interface ThemeState {
  theme: Theme;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  updatePhysics: (key: keyof PhysicsSettings, value: number) => void;
  resetTheme: () => void;
}

// Apply theme to CSS variables
const applyThemeToDOM = (theme: Theme) => {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--background', theme.colors.background);
  root.style.setProperty('--foreground', theme.colors.foreground);
  root.style.setProperty('--node-glow', theme.colors.nodeGlow);
  root.style.setProperty('--ring', theme.colors.primary);
  root.style.setProperty('--sidebar-primary', theme.colors.primary);
  root.style.setProperty('--sidebar-ring', theme.colors.primary);
  root.style.setProperty('--canvas-bg', theme.colors.canvasBackground);
  root.style.setProperty('--folder-node', theme.colors.folderNodeColor);
  root.style.setProperty('--file-node', theme.colors.fileNodeColor);
};

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        theme: defaultTheme,
        
        updateColor: (key, value) => set(
          (state) => {
            const newTheme = {
              ...state.theme,
              colors: { ...state.theme.colors, [key]: value },
            };
            applyThemeToDOM(newTheme);
            return { theme: newTheme };
          },
          false,
          'updateColor'
        ),
        
        updatePhysics: (key, value) => set(
          (state) => ({
            theme: {
              ...state.theme,
              physics: { ...state.theme.physics, [key]: value },
            },
          }),
          false,
          'updatePhysics'
        ),
        
        resetTheme: () => set(
          () => {
            applyThemeToDOM(defaultTheme);
            return { theme: defaultTheme };
          },
          false,
          'resetTheme'
        ),
      }),
      {
        name: 'app-theme',
        onRehydrateStorage: () => (state) => {
          // Apply theme to DOM after rehydration
          if (state?.theme) {
            applyThemeToDOM(state.theme);
          }
        },
        // Migrate old format to new format
        migrate: (persistedState: any, version: number) => {
          if (persistedState && persistedState.primary && !persistedState.theme) {
            // Old format - migrate
            return {
              theme: {
                colors: {
                  primary: persistedState.primary || defaultTheme.colors.primary,
                  accent: persistedState.accent || defaultTheme.colors.accent,
                  background: persistedState.background || defaultTheme.colors.background,
                  foreground: persistedState.foreground || defaultTheme.colors.foreground,
                  nodeGlow: persistedState.nodeGlow || defaultTheme.colors.nodeGlow,
                  linkColor: persistedState.linkColor || defaultTheme.colors.linkColor,
                  canvasBackground: defaultTheme.colors.canvasBackground,
                  folderNodeColor: defaultTheme.colors.folderNodeColor,
                  fileNodeColor: defaultTheme.colors.fileNodeColor,
                },
                physics: defaultTheme.physics,
              },
            };
          }
          return persistedState as ThemeState;
        },
        version: 1,
      }
    ),
    { name: 'ThemeStore' }
  )
);

// Initialize theme on module load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('app-theme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.theme) {
        applyThemeToDOM(parsed.state.theme);
      }
    } catch {
      applyThemeToDOM(defaultTheme);
    }
  } else {
    applyThemeToDOM(defaultTheme);
  }
}
