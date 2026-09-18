/**
 * Color Utilities - CSS variable resolution and color manipulation
 * 
 * Extracted from NetworkGraph for reuse across components
 */

/**
 * Resolve CSS variable colors to actual HSL values for canvas rendering
 */
export function resolveColor(color: string): string {
	// If it's already a resolved HSL/HSLA value (no CSS variables), return as-is
	if (!color.includes('var(')) {
		return color;
	}

	// Extract the CSS variable name
	const varMatch = color.match(/var\(--([^)]+)\)/);
	if (!varMatch) return color;

	const varName = varMatch[1];

	// Get the computed value from CSS
	const computedValue = getComputedStyle(document.documentElement)
		.getPropertyValue(`--${varName}`)
		.trim();

	if (!computedValue) return color;

	// Replace the var() with the actual value
	return color.replace(`var(--${varName})`, computedValue);
}

/**
 * Convert color to HSLA with opacity for canvas
 */
export function colorWithOpacity(color: string, opacity: number): string {
	const resolved = resolveColor(color).trim();
	const alpha = Math.min(1, Math.max(0, opacity));
	const hsl = resolved.match(/^hsla?\((.*)\)$/i);
	if (hsl) {
		const [h, s, l] = hsl[1].split(/[\s,/]+/).filter(Boolean);
		if (h !== undefined && s !== undefined && l !== undefined) {
			return `hsl(${h} ${s} ${l} / ${alpha})`;
		}
	}
	const bareHsl = resolved.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
	if (bareHsl) return `hsl(${bareHsl[1]} ${bareHsl[2]}% ${bareHsl[3]}% / ${alpha})`;
	const hex = resolved.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
	if (hex) {
		const value = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
		return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
	}
	const rgb = resolved.match(/^rgba?\((.*)\)$/i);
	if (rgb) {
		const [r, g, b] = rgb[1].split(/[\s,/]+/).filter(Boolean);
		if (r !== undefined && g !== undefined && b !== undefined) return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return resolved;
}

