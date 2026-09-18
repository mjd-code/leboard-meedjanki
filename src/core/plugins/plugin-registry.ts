/**
 * Plugin Registry - Central registry for feature registration and lifecycle management
 * 
 * This is the foundation of the plugin architecture, allowing features to be
 * registered, initialized, and cleaned up dynamically.
 */

export type ServiceFactory<T = unknown> = () => T | Promise<T>;
export type ComponentFactory = () => Promise<{ default: React.ComponentType<any> }>;
export type HookFactory = () => Promise<{ default: (...args: any[]) => any }>;

export interface RouteConfig {
	path: string;
	component: string; // Component name to resolve from components registry
	props?: Record<string, any>;
	protected?: boolean; // Requires authentication
}

export interface ComponentRegistry {
	[name: string]: ComponentFactory;
}

export interface HookRegistry {
	[name: string]: HookFactory;
}

export interface Feature {
	id: string;
	name: string;
	version: string;
	dependencies?: string[]; // Feature IDs this feature depends on
	services?: Array<{
		name: string; // Service identifier
		factory: ServiceFactory;
		singleton?: boolean; // If true, service is created once and reused
	}>;
	components?: ComponentRegistry;
	routes?: RouteConfig[];
	hooks?: HookRegistry;
	initialize?: () => Promise<void>;
	cleanup?: () => Promise<void>;
	enabled?: boolean; // Feature can be disabled
}

export interface FeatureStatus {
	id: string;
	registered: boolean;
	initialized: boolean;
	enabled: boolean;
	error?: string;
}

/**
 * Plugin Registry - Manages feature registration and lifecycle
 */
export class PluginRegistry {
	private features: Map<string, Feature> = new Map();
	private featureStatus: Map<string, FeatureStatus> = new Map();
	private initializedFeatures: Set<string> = new Set();
	private initializationOrder: string[] = [];

	/**
	 * Register a feature
	 */
	register(feature: Feature): void {
		if (this.features.has(feature.id)) {
			console.warn(`[PluginRegistry] Feature ${feature.id} is already registered. Overwriting.`);
		}

		// Validate dependencies exist
		if (feature.dependencies) {
			for (const depId of feature.dependencies) {
				if (!this.features.has(depId)) {
					console.warn(
						`[PluginRegistry] Feature ${feature.id} depends on ${depId}, but it's not registered yet.`
					);
				}
			}
		}

		this.features.set(feature.id, feature);
		this.featureStatus.set(feature.id, {
			id: feature.id,
			registered: true,
			initialized: false,
			enabled: feature.enabled !== false, // Default to enabled
		});

		console.log(`[PluginRegistry] Registered feature: ${feature.id} v${feature.version}`);
	}

	/**
	 * Unregister a feature
	 */
	async unregister(featureId: string): Promise<void> {
		const feature = this.features.get(featureId);
		if (!feature) {
			console.warn(`[PluginRegistry] Feature ${featureId} is not registered.`);
			return;
		}

		// Cleanup if initialized
		if (this.initializedFeatures.has(featureId)) {
			if (feature.cleanup) {
				try {
					await feature.cleanup();
				} catch (error) {
					console.error(`[PluginRegistry] Error cleaning up feature ${featureId}:`, error);
				}
			}
			this.initializedFeatures.delete(featureId);
		}

		this.features.delete(featureId);
		this.featureStatus.delete(featureId);
		const index = this.initializationOrder.indexOf(featureId);
		if (index > -1) {
			this.initializationOrder.splice(index, 1);
		}

		console.log(`[PluginRegistry] Unregistered feature: ${featureId}`);
	}

	/**
	 * Get a feature by ID
	 */
	get(featureId: string): Feature | undefined {
		return this.features.get(featureId);
	}

	/**
	 * Get all registered features
	 */
	getAll(): Feature[] {
		return Array.from(this.features.values());
	}

	/**
	 * Get feature status
	 */
	getStatus(featureId: string): FeatureStatus | undefined {
		return this.featureStatus.get(featureId);
	}

	/**
	 * Get all feature statuses
	 */
	getAllStatuses(): FeatureStatus[] {
		return Array.from(this.featureStatus.values());
	}

	/**
	 * Enable a feature
	 */
	enable(featureId: string): void {
		const status = this.featureStatus.get(featureId);
		if (status) {
			status.enabled = true;
		}
	}

	/**
	 * Disable a feature
	 */
	async disable(featureId: string): Promise<void> {
		const feature = this.features.get(featureId);
		const status = this.featureStatus.get(featureId);
		if (!feature || !status) return;

		// Cleanup if initialized
		if (this.initializedFeatures.has(featureId)) {
			if (feature.cleanup) {
				try {
					await feature.cleanup();
				} catch (error) {
					console.error(`[PluginRegistry] Error cleaning up feature ${featureId}:`, error);
				}
			}
			this.initializedFeatures.delete(featureId);
			status.initialized = false;
		}

		status.enabled = false;
	}

	/**
	 * Initialize a feature and its dependencies
	 */
	async initialize(featureId: string): Promise<void> {
		const feature = this.features.get(featureId);
		if (!feature) {
			throw new Error(`Feature ${featureId} is not registered`);
		}

		const status = this.featureStatus.get(featureId)!;

		if (!status.enabled) {
			console.log(`[PluginRegistry] Feature ${featureId} is disabled, skipping initialization`);
			return;
		}

		if (this.initializedFeatures.has(featureId)) {
			console.log(`[PluginRegistry] Feature ${featureId} is already initialized`);
			return;
		}

		// Initialize dependencies first
		if (feature.dependencies) {
			for (const depId of feature.dependencies) {
				if (!this.initializedFeatures.has(depId)) {
					await this.initialize(depId);
				}
			}
		}

		// Initialize the feature
		try {
			if (feature.initialize) {
				await feature.initialize();
			}
			this.initializedFeatures.add(featureId);
			status.initialized = true;
			status.error = undefined;
			this.initializationOrder.push(featureId);
			console.log(`[PluginRegistry] Initialized feature: ${featureId}`);
		} catch (error) {
			status.error = error instanceof Error ? error.message : String(error);
			console.error(`[PluginRegistry] Failed to initialize feature ${featureId}:`, error);
			throw error;
		}
	}

	/**
	 * Initialize all registered features in dependency order
	 */
	async initializeAll(): Promise<void> {
		const features = Array.from(this.features.values());
		const enabledFeatures = features.filter((f) => this.featureStatus.get(f.id)?.enabled !== false);

		// Topological sort to respect dependencies
		const sorted = this.topologicalSort(enabledFeatures);

		for (const feature of sorted) {
			if (!this.initializedFeatures.has(feature.id)) {
				await this.initialize(feature.id);
			}
		}
	}

	/**
	 * Cleanup a feature
	 */
	async cleanup(featureId: string): Promise<void> {
		const feature = this.features.get(featureId);
		if (!feature) return;

		if (!this.initializedFeatures.has(featureId)) {
			return;
		}

		try {
			if (feature.cleanup) {
				await feature.cleanup();
			}
			this.initializedFeatures.delete(featureId);
			const status = this.featureStatus.get(featureId);
			if (status) {
				status.initialized = false;
			}
			console.log(`[PluginRegistry] Cleaned up feature: ${featureId}`);
		} catch (error) {
			console.error(`[PluginRegistry] Error cleaning up feature ${featureId}:`, error);
			throw error;
		}
	}

	/**
	 * Cleanup all features in reverse initialization order
	 */
	async cleanupAll(): Promise<void> {
		const reversed = [...this.initializationOrder].reverse();
		for (const featureId of reversed) {
			await this.cleanup(featureId);
		}
	}

	/**
	 * Topological sort to respect dependencies
	 */
	private topologicalSort(features: Feature[]): Feature[] {
		const sorted: Feature[] = [];
		const visited = new Set<string>();
		const visiting = new Set<string>();

		const visit = (feature: Feature) => {
			if (visiting.has(feature.id)) {
				console.warn(
					`[PluginRegistry] Circular dependency detected involving ${feature.id}`
				);
				return;
			}
			if (visited.has(feature.id)) {
				return;
			}

			visiting.add(feature.id);

			// Visit dependencies first
			if (feature.dependencies) {
				for (const depId of feature.dependencies) {
					const dep = this.features.get(depId);
					if (dep) {
						visit(dep);
					}
				}
			}

			visiting.delete(feature.id);
			visited.add(feature.id);
			sorted.push(feature);
		};

		for (const feature of features) {
			if (!visited.has(feature.id)) {
				visit(feature);
			}
		}

		return sorted;
	}

	/**
	 * Get all routes from all features
	 */
	getAllRoutes(): RouteConfig[] {
		const routes: RouteConfig[] = [];
		for (const feature of this.features.values()) {
			if (feature.routes && this.featureStatus.get(feature.id)?.enabled !== false) {
				routes.push(...feature.routes);
			}
		}
		return routes;
	}

	/**
	 * Get all components from all features
	 */
	getAllComponents(): Map<string, ComponentFactory> {
		const components = new Map<string, ComponentFactory>();
		for (const feature of this.features.values()) {
			if (feature.components && this.featureStatus.get(feature.id)?.enabled !== false) {
				for (const [name, factory] of Object.entries(feature.components)) {
					components.set(name, factory);
				}
			}
		}
		return components;
	}

	/**
	 * Get all hooks from all features
	 */
	getAllHooks(): Map<string, HookFactory> {
		const hooks = new Map<string, HookFactory>();
		for (const feature of this.features.values()) {
			if (feature.hooks && this.featureStatus.get(feature.id)?.enabled !== false) {
				for (const [name, factory] of Object.entries(feature.hooks)) {
					hooks.set(name, factory);
				}
			}
		}
		return hooks;
	}
}

// Singleton instance
export const pluginRegistry = new PluginRegistry();

