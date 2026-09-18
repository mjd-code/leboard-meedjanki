/**
 * Feature Registry - Convenience functions for feature management
 * 
 * This module provides high-level functions for working with the plugin registry
 * and makes it easy to register and manage features.
 */

import { pluginRegistry, type Feature } from './plugin-registry';

/**
 * Register a feature
 */
export function registerFeature(feature: Feature): void {
	pluginRegistry.register(feature);
}

/**
 * Register multiple features
 */
export function registerFeatures(features: Feature[]): void {
	for (const feature of features) {
		registerFeature(feature);
	}
}

/**
 * Get a feature by ID
 */
export function getFeature(featureId: string): Feature | undefined {
	return pluginRegistry.get(featureId);
}

/**
 * Get all registered features
 */
export function getAllFeatures(): Feature[] {
	return pluginRegistry.getAll();
}

/**
 * Initialize a feature
 */
export async function initializeFeature(featureId: string): Promise<void> {
	await pluginRegistry.initialize(featureId);
}

/**
 * Initialize all features
 */
export async function initializeAllFeatures(): Promise<void> {
	await pluginRegistry.initializeAll();
}

/**
 * Cleanup a feature
 */
export async function cleanupFeature(featureId: string): Promise<void> {
	await pluginRegistry.cleanup(featureId);
}

/**
 * Cleanup all features
 */
export async function cleanupAllFeatures(): Promise<void> {
	await pluginRegistry.cleanupAll();
}

/**
 * Enable a feature
 */
export function enableFeature(featureId: string): void {
	pluginRegistry.enable(featureId);
}

/**
 * Disable a feature
 */
export async function disableFeature(featureId: string): Promise<void> {
	await pluginRegistry.disable(featureId);
}

/**
 * Get feature status
 */
export function getFeatureStatus(featureId: string) {
	return pluginRegistry.getStatus(featureId);
}

/**
 * Get all feature statuses
 */
export function getAllFeatureStatuses() {
	return pluginRegistry.getAllStatuses();
}

/**
 * Get all routes from registered features
 */
export function getAllRoutes() {
	return pluginRegistry.getAllRoutes();
}

/**
 * Get all components from registered features
 */
export function getAllComponents() {
	return pluginRegistry.getAllComponents();
}

/**
 * Get all hooks from registered features
 */
export function getAllHooks() {
	return pluginRegistry.getAllHooks();
}

// Re-export plugin registry for advanced usage
export { pluginRegistry };

