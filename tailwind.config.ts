import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // IBM Plex - Clean enterprise typography (Carbon Design System)
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        // Legacy alias
        ms: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // Slide-specific font scale (applied via .slide-content class in CSS)
      // Keep Tailwind defaults for app UI, override only in slide contexts
      colors: {
        // Slide Design System - Clean, accessible tokens
        slide: {
          primary: 'hsl(var(--slide-primary))',
          'primary-light': 'hsl(var(--slide-primary-light))',
          accent: 'hsl(var(--slide-accent))',
          'accent-light': 'hsl(var(--slide-accent-light))',
          'accent-muted': 'hsl(var(--slide-accent-muted))',
          success: 'hsl(var(--slide-success))',
          warning: 'hsl(var(--slide-warning))',
          error: 'hsl(var(--slide-error))',
          // Gray scale
          'gray-100': 'hsl(var(--slide-gray-100))',
          'gray-200': 'hsl(var(--slide-gray-200))',
          'gray-300': 'hsl(var(--slide-gray-300))',
          'gray-400': 'hsl(var(--slide-gray-400))',
          'gray-500': 'hsl(var(--slide-gray-500))',
          'gray-600': 'hsl(var(--slide-gray-600))',
          'gray-700': 'hsl(var(--slide-gray-700))',
          'gray-800': 'hsl(var(--slide-gray-800))',
          'gray-900': 'hsl(var(--slide-gray-900))',
          bg: "hsl(var(--slide-bg))",
        },
        // Legacy MS tokens (backwards compatibility)
        ms: {
          blue: 'hsl(var(--ms-blue))',
          navy: 'hsl(var(--ms-navy))',
          'navy-80': 'hsl(var(--ms-navy-80))',
          'blue-80': 'hsl(var(--ms-blue-80))',
          'blue-40': 'hsl(var(--ms-blue-40))',
          'blue-20': 'hsl(var(--ms-blue-20))',
          jade: 'hsl(var(--ms-jade))',
          ocean: 'hsl(var(--ms-ocean))',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        canvas: {
          bg: "hsl(var(--canvas-bg))",
        },
        comment: {
          pin: "hsl(var(--comment-pin))",
          "pin-resolved": "hsl(var(--comment-pin-resolved))",
        },
      },
      // Spacing scale for slides (based on 8px grid)
      spacing: {
        'slide-xs': '0.5rem',   // 8px
        'slide-sm': '1rem',     // 16px
        'slide-md': '1.5rem',   // 24px
        'slide-lg': '2rem',     // 32px
        'slide-xl': '3rem',     // 48px
        'slide-2xl': '4rem',    // 64px
        'slide-3xl': '5rem',    // 80px
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
