/**
 * Core Services - Foundation of the plugin architecture
 * 
 * This module exports all core infrastructure:
 * - Plugin Registry: Feature registration and lifecycle
 * - Dependency Injection Container: Service management
 * - Feature Registry: Convenience functions
 */

// Re-export plugin-registry (excluding ServiceFactory to avoid conflict)
export {
  type ComponentFactory,
  type HookFactory,
  type RouteConfig,
  type ComponentRegistry,
  type HookRegistry,
  type Feature,
  type FeatureStatus,
  PluginRegistry,
  pluginRegistry,
} from './plugin-registry';

// Re-export container
export * from '@/shared/di/container';

// Re-export features
export * from './features';

