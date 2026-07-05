// Showcase data mirroring the shipped presets in
// packages/svelte-docsmith/src/lib/themes/*.css. Used by the theme gallery
// (scoped preview) and the runtime theme store (whole-site apply). Only the
// core tokens are listed; the store derives the rest (ring, input, popover,
// sidebar*) from these at apply time. If you change a preset's CSS, mirror it here.

export type ThemeTokens = Record<string, string>;
export type Theme = { name: string; slug: string; light: ThemeTokens; dark: ThemeTokens };

export const themes: Theme[] = [
	{
		name: 'Tangerine',
		slug: 'tangerine',
		light: {
			background: 'oklch(0.9383 0.0042 236)',
			foreground: 'oklch(0.3211 0 0)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.3211 0 0)',
			primary: 'oklch(0.6397 0.172 36)',
			'primary-foreground': 'oklch(1 0 0)',
			secondary: 'oklch(0.967 0.003 264)',
			'secondary-foreground': 'oklch(0.446 0.026 257)',
			muted: 'oklch(0.985 0.002 248)',
			'muted-foreground': 'oklch(0.551 0.023 264)',
			accent: 'oklch(0.912 0.022 244)',
			'accent-foreground': 'oklch(0.379 0.138 266)',
			border: 'oklch(0.902 0.005 248)',
			radius: '0.75rem'
		},
		dark: {
			background: 'oklch(0.2598 0.0306 263)',
			foreground: 'oklch(0.9219 0 0)',
			card: 'oklch(0.311 0.03 269)',
			'card-foreground': 'oklch(0.9219 0 0)',
			primary: 'oklch(0.6397 0.172 36)',
			'primary-foreground': 'oklch(1 0 0)',
			secondary: 'oklch(0.31 0.027 267)',
			'secondary-foreground': 'oklch(0.9219 0 0)',
			muted: 'oklch(0.31 0.027 267)',
			'muted-foreground': 'oklch(0.7155 0 0)',
			accent: 'oklch(0.338 0.059 268)',
			'accent-foreground': 'oklch(0.882 0.057 254)',
			border: 'oklch(0.384 0.03 270)',
			radius: '0.75rem'
		}
	},
	{
		name: 'Amethyst',
		slug: 'amethyst',
		light: {
			background: 'oklch(0.993 0.004 300)',
			foreground: 'oklch(0.28 0.02 300)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.28 0.02 300)',
			primary: 'oklch(0.55 0.22 295)',
			'primary-foreground': 'oklch(0.99 0 0)',
			secondary: 'oklch(0.968 0.006 300)',
			'secondary-foreground': 'oklch(0.42 0.03 297)',
			muted: 'oklch(0.975 0.005 300)',
			'muted-foreground': 'oklch(0.52 0.02 300)',
			accent: 'oklch(0.94 0.03 300)',
			'accent-foreground': 'oklch(0.4 0.15 295)',
			border: 'oklch(0.92 0.008 300)',
			radius: '0.75rem'
		},
		dark: {
			background: 'oklch(0.19 0.02 300)',
			foreground: 'oklch(0.95 0.005 300)',
			card: 'oklch(0.23 0.022 300)',
			'card-foreground': 'oklch(0.95 0.005 300)',
			primary: 'oklch(0.7 0.17 295)',
			'primary-foreground': 'oklch(0.16 0.02 300)',
			secondary: 'oklch(0.27 0.02 300)',
			'secondary-foreground': 'oklch(0.95 0.005 300)',
			muted: 'oklch(0.27 0.02 300)',
			'muted-foreground': 'oklch(0.72 0.01 300)',
			accent: 'oklch(0.32 0.05 300)',
			'accent-foreground': 'oklch(0.86 0.06 296)',
			border: 'oklch(0.33 0.02 300)',
			radius: '0.75rem'
		}
	},
	{
		name: 'Graphite',
		slug: 'graphite',
		light: {
			background: 'oklch(1 0 0)',
			foreground: 'oklch(0.21 0.006 265)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.21 0.006 265)',
			primary: 'oklch(0.27 0.01 265)',
			'primary-foreground': 'oklch(0.99 0 0)',
			secondary: 'oklch(0.968 0.002 265)',
			'secondary-foreground': 'oklch(0.35 0.008 265)',
			muted: 'oklch(0.97 0.002 265)',
			'muted-foreground': 'oklch(0.51 0.007 265)',
			accent: 'oklch(0.96 0.003 265)',
			'accent-foreground': 'oklch(0.27 0.01 265)',
			border: 'oklch(0.922 0.003 265)',
			radius: '0.375rem'
		},
		dark: {
			background: 'oklch(0.18 0.004 265)',
			foreground: 'oklch(0.96 0.002 265)',
			card: 'oklch(0.22 0.005 265)',
			'card-foreground': 'oklch(0.96 0.002 265)',
			primary: 'oklch(0.93 0.002 265)',
			'primary-foreground': 'oklch(0.21 0.006 265)',
			secondary: 'oklch(0.27 0.006 265)',
			'secondary-foreground': 'oklch(0.96 0.002 265)',
			muted: 'oklch(0.27 0.006 265)',
			'muted-foreground': 'oklch(0.72 0.005 265)',
			accent: 'oklch(0.3 0.006 265)',
			'accent-foreground': 'oklch(0.96 0.002 265)',
			border: 'oklch(0.32 0.006 265)',
			radius: '0.375rem'
		}
	},
	{
		name: 'Evergreen',
		slug: 'evergreen',
		light: {
			background: 'oklch(0.99 0.006 150)',
			foreground: 'oklch(0.26 0.02 155)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.26 0.02 155)',
			primary: 'oklch(0.52 0.11 156)',
			'primary-foreground': 'oklch(0.99 0 0)',
			secondary: 'oklch(0.965 0.01 150)',
			'secondary-foreground': 'oklch(0.35 0.02 155)',
			muted: 'oklch(0.97 0.008 150)',
			'muted-foreground': 'oklch(0.5 0.02 155)',
			accent: 'oklch(0.93 0.035 150)',
			'accent-foreground': 'oklch(0.38 0.08 156)',
			border: 'oklch(0.9 0.012 150)',
			radius: '0.75rem'
		},
		dark: {
			background: 'oklch(0.2 0.02 158)',
			foreground: 'oklch(0.94 0.01 150)',
			card: 'oklch(0.24 0.022 158)',
			'card-foreground': 'oklch(0.94 0.01 150)',
			primary: 'oklch(0.7 0.14 156)',
			'primary-foreground': 'oklch(0.16 0.02 155)',
			secondary: 'oklch(0.27 0.02 158)',
			'secondary-foreground': 'oklch(0.94 0.01 150)',
			muted: 'oklch(0.27 0.02 158)',
			'muted-foreground': 'oklch(0.72 0.012 150)',
			accent: 'oklch(0.32 0.05 156)',
			'accent-foreground': 'oklch(0.85 0.08 153)',
			border: 'oklch(0.33 0.02 158)',
			radius: '0.75rem'
		}
	},
	{
		name: 'Rosé',
		slug: 'rose',
		light: {
			background: 'oklch(0.99 0.006 12)',
			foreground: 'oklch(0.28 0.02 12)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.28 0.02 12)',
			primary: 'oklch(0.58 0.17 13)',
			'primary-foreground': 'oklch(0.99 0 0)',
			secondary: 'oklch(0.967 0.008 12)',
			'secondary-foreground': 'oklch(0.4 0.03 12)',
			muted: 'oklch(0.972 0.007 12)',
			'muted-foreground': 'oklch(0.52 0.02 12)',
			accent: 'oklch(0.94 0.03 12)',
			'accent-foreground': 'oklch(0.42 0.13 13)',
			border: 'oklch(0.91 0.012 12)',
			radius: '1rem'
		},
		dark: {
			background: 'oklch(0.2 0.02 14)',
			foreground: 'oklch(0.95 0.01 12)',
			card: 'oklch(0.24 0.022 14)',
			'card-foreground': 'oklch(0.95 0.01 12)',
			primary: 'oklch(0.72 0.15 13)',
			'primary-foreground': 'oklch(0.18 0.02 12)',
			secondary: 'oklch(0.27 0.02 14)',
			'secondary-foreground': 'oklch(0.95 0.01 12)',
			muted: 'oklch(0.27 0.02 14)',
			'muted-foreground': 'oklch(0.72 0.012 12)',
			accent: 'oklch(0.32 0.05 13)',
			'accent-foreground': 'oklch(0.86 0.07 12)',
			border: 'oklch(0.33 0.02 14)',
			radius: '1rem'
		}
	},
	{
		name: 'Ocean',
		slug: 'ocean',
		light: {
			background: 'oklch(0.99 0.005 215)',
			foreground: 'oklch(0.26 0.02 225)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.26 0.02 225)',
			primary: 'oklch(0.55 0.11 220)',
			'primary-foreground': 'oklch(0.99 0 0)',
			secondary: 'oklch(0.965 0.008 215)',
			'secondary-foreground': 'oklch(0.35 0.02 225)',
			muted: 'oklch(0.97 0.006 215)',
			'muted-foreground': 'oklch(0.5 0.02 225)',
			accent: 'oklch(0.93 0.03 210)',
			'accent-foreground': 'oklch(0.38 0.09 222)',
			border: 'oklch(0.9 0.01 215)',
			radius: '0.75rem'
		},
		dark: {
			background: 'oklch(0.19 0.02 228)',
			foreground: 'oklch(0.94 0.01 215)',
			card: 'oklch(0.23 0.022 228)',
			'card-foreground': 'oklch(0.94 0.01 215)',
			primary: 'oklch(0.72 0.12 210)',
			'primary-foreground': 'oklch(0.16 0.02 225)',
			secondary: 'oklch(0.27 0.02 228)',
			'secondary-foreground': 'oklch(0.94 0.01 215)',
			muted: 'oklch(0.27 0.02 228)',
			'muted-foreground': 'oklch(0.72 0.012 215)',
			accent: 'oklch(0.32 0.055 216)',
			'accent-foreground': 'oklch(0.85 0.08 214)',
			border: 'oklch(0.33 0.02 228)',
			radius: '0.75rem'
		}
	}
];

export const defaultThemeSlug = 'tangerine';
