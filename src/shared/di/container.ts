/**
 * Dependency Injection Container - Service Locator Pattern
 *
 * Provides a centralized registry for services, enabling:
 * - Service registration and resolution
 * - Singleton management
 * - Lazy initialization
 * - Service swapping for testing
 */

export type ServiceIdentifier = string | symbol;
export type ServiceFactory<T = unknown> = (
	container: Container
) => T | Promise<T>;

export interface ServiceRegistration<T = unknown> {
	factory: ServiceFactory<T>;
	singleton: boolean;
	instance?: T;
	resolved: boolean;
}

/**
 * Dependency Injection Container
 */
export class Container {
	private services: Map<ServiceIdentifier, ServiceRegistration> = new Map();
	private resolving: Set<ServiceIdentifier> = new Set();

	/**
	 * Register a service
	 */
	register<T>(
		identifier: ServiceIdentifier,
		factory: ServiceFactory<T>,
		options?: { singleton?: boolean }
	): void {
		if (this.services.has(identifier)) {
			console.warn(
				`[Container] Service ${String(
					identifier
				)} is already registered. Overwriting.`
			);
		}

		this.services.set(identifier, {
			factory: factory as ServiceFactory,
			singleton: options?.singleton !== false, // Default to singleton
			resolved: false,
		});

		console.log(`[Container] Registered service: ${String(identifier)}`);
	}

	/**
	 * Register a service instance directly
	 */
	registerInstance<T>(identifier: ServiceIdentifier, instance: T): void {
		this.services.set(identifier, {
			factory: () => instance,
			singleton: true,
			instance,
			resolved: true,
		});
	}

	/**
	 * Resolve a service
	 */
	async resolve<T>(identifier: ServiceIdentifier): Promise<T> {
		const registration = this.services.get(identifier);
		if (!registration) {
			throw new Error(`Service ${String(identifier)} is not registered`);
		}

		// Return singleton instance if already resolved
		if (
			registration.singleton &&
			registration.resolved &&
			registration.instance !== undefined
		) {
			return registration.instance as T;
		}

		// Detect circular dependencies
		if (this.resolving.has(identifier)) {
			throw new Error(
				`Circular dependency detected while resolving service ${String(
					identifier
				)}`
			);
		}

		this.resolving.add(identifier);

		try {
			// Create service instance
			const instance = await registration.factory(this);

			if (registration.singleton) {
				registration.instance = instance;
				registration.resolved = true;
			}

			return instance as T;
		} finally {
			this.resolving.delete(identifier);
		}
	}

	/**
	 * Resolve a service synchronously (only works for already-resolved singletons)
	 */
	resolveSync<T>(identifier: ServiceIdentifier): T {
		const registration = this.services.get(identifier);
		if (!registration) {
			throw new Error(`Service ${String(identifier)} is not registered`);
		}

		if (!registration.resolved || registration.instance === undefined) {
			throw new Error(
				`Service ${String(
					identifier
				)} is not yet resolved. Use resolve() for async resolution.`
			);
		}

		return registration.instance as T;
	}

	/**
	 * Check if a service is registered
	 */
	has(identifier: ServiceIdentifier): boolean {
		return this.services.has(identifier);
	}

	/**
	 * Check if a service is resolved
	 */
	isResolved(identifier: ServiceIdentifier): boolean {
		const registration = this.services.get(identifier);
		return registration?.resolved === true;
	}

	/**
	 * Unregister a service
	 */
	unregister(identifier: ServiceIdentifier): void {
		this.services.delete(identifier);
		console.log(`[Container] Unregistered service: ${String(identifier)}`);
	}

	/**
	 * Clear all services
	 */
	clear(): void {
		this.services.clear();
		this.resolving.clear();
	}

	/**
	 * Get all registered service identifiers
	 */
	getRegisteredServices(): ServiceIdentifier[] {
		return Array.from(this.services.keys());
	}

	/**
	 * Get service registration info (for debugging)
	 */
	getRegistration(
		identifier: ServiceIdentifier
	): ServiceRegistration | undefined {
		return this.services.get(identifier);
	}
}

// Global container instance
export const container = new Container();

// Service identifiers (using symbols for type safety)
export const ServiceIds = {
	// Core services
	EventBus: Symbol('EventBus'),
	PluginRegistry: Symbol('PluginRegistry'),
	CommandRegistry: Symbol('CommandRegistry'),

	// Vault services
	VaultManager: Symbol('VaultManager'),
	VaultStorage: Symbol('VaultStorage'),
	VaultSyncService: Symbol('VaultSyncService'),
	VaultBackupService: Symbol('VaultBackupService'),

	// Graph services
	GraphService: Symbol('GraphService'),
	ContentParser: Symbol('ContentParser'),
	RelationshipMapper: Symbol('RelationshipMapper'),

	// Import/Export services
	ImportExportService: Symbol('ImportExportService'),
	ZipImportService: Symbol('ZipImportService'),

	// Persistence services
	FileSystemService: Symbol('FileSystemService'),

	// Sync services
	BackgroundSyncService: Symbol('BackgroundSyncService'),

	// Integration services
	SupabaseClient: Symbol('SupabaseClient'),

	// API services
	ApiKeyService: Symbol('ApiKeyService'),

	// Sync engine
	SyncEngine: Symbol('SyncEngine'),
} as const;
