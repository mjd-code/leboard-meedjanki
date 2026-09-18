/**
 * Application bootstrap
 *
 * Registers every long-lived service in the DI container so features can
 * resolve them through `useService` instead of importing singletons directly.
 */

import { container, ServiceIds } from "@/shared/di/container";
import { eventBus } from "@/shared/events/events";
import { pluginRegistry } from "@/core/plugins/plugin-registry";
import { getVaultManager } from "@/core/vault/VaultManagerSingleton";
import { VaultStorage } from "@/core/vault/VaultStorage";
import { vaultSyncService } from "@/core/vault/VaultSyncService";
import { VaultBackupService } from "@/core/vault/VaultBackupService";
import { GraphService } from "@/core/graph/GraphService";
import { RelationshipMapper } from "@/core/graph/RelationshipMapper";
import { ContentParser } from "@/core/metadata/content-parser";
import { FileSystemService } from "@/core/persistence/FileSystemService";
import { backgroundSyncService } from "@/core/sync/BackgroundSyncService";
import { importExportService } from "@/features/import-export/services/ImportExportService";
import { apiKeyService } from "@/features/profile/services/ApiKeyService";
import { supabase } from "@/integrations/supabase/client";
import { commandRegistry } from "@/core/commands/CommandRegistry";
import { registerEditorCommands } from "@/features/editor/commands/editorCommands";
import { syncEngine } from "@/core/sync/SyncEngine";
import { registerToggleableFeatures } from "@/core/plugins/feature-toggles";

let bootstrapped = false;

export function bootstrapApp(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  container.registerInstance(ServiceIds.EventBus, eventBus);
  container.registerInstance(ServiceIds.PluginRegistry, pluginRegistry);
  container.registerInstance(ServiceIds.SupabaseClient, supabase);

  container.registerInstance(ServiceIds.VaultManager, getVaultManager());
  container.register(ServiceIds.VaultStorage, () => new VaultStorage());
  container.registerInstance(ServiceIds.VaultSyncService, vaultSyncService);
  container.register(
    ServiceIds.VaultBackupService,
    () => new VaultBackupService()
  );

  container.register(ServiceIds.GraphService, () => new GraphService());
  container.register(
    ServiceIds.RelationshipMapper,
    () => new RelationshipMapper()
  );
  container.register(ServiceIds.ContentParser, () => new ContentParser());

  container.register(
    ServiceIds.FileSystemService,
    () => new FileSystemService()
  );
  container.registerInstance(
    ServiceIds.BackgroundSyncService,
    backgroundSyncService
  );

  container.registerInstance(
    ServiceIds.ImportExportService,
    importExportService
  );
  container.registerInstance(ServiceIds.ApiKeyService, apiKeyService);

  container.registerInstance(ServiceIds.CommandRegistry, commandRegistry);
  registerEditorCommands();

  // Sync engine owns dirty tracking, conflict copies and the offline queue.
  syncEngine.attachVaultManager(getVaultManager());
  container.registerInstance(ServiceIds.SyncEngine, syncEngine);
  void syncEngine.replayQueue();

  registerToggleableFeatures();
}
