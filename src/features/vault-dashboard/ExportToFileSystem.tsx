import { useState } from "react";
import { Download, FolderOutput, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/ui/dialog";
import { Progress } from "@/shared/ui/progress";
import { toast } from "sonner";

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  mediaType?: "image" | "audio" | "video";
  mimeType?: string;
  dataUrl?: string;
}

interface ExportToFileSystemProps {
  vaultName: string;
  nodes: Node[];
  trigger?: React.ReactNode;
}

export const ExportToFileSystem = ({ vaultName, nodes, trigger }: ExportToFileSystemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "exporting" | "success" | "error">("idle");

  const checkFileSystemAccess = () => {
    return "showDirectoryPicker" in window;
  };

  const exportToFileSystem = async () => {
    if (!checkFileSystemAccess()) {
      toast.error("Your browser doesn't support the File System Access API");
      return;
    }

    setIsExporting(true);
    setStatus("exporting");
    setProgress(0);

    try {
      // Request directory access
      // @ts-ignore - File System Access API
      const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });

      // Create vault folder
      const vaultFolderHandle = await directoryHandle.getDirectoryHandle(
        vaultName.replace(/[^a-zA-Z0-9-_\s]/g, ""),
        { create: true }
      );

      // Build folder structure map
      const folderHandles = new Map<string, FileSystemDirectoryHandle>();
      folderHandles.set("root", vaultFolderHandle);

      // First pass: create all folders
      const folders = nodes.filter(n => n.type === "folder").sort((a, b) => a.depth - b.depth);
      
      for (const folder of folders) {
        const parentHandle = folder.parentId 
          ? folderHandles.get(folder.parentId) || vaultFolderHandle
          : vaultFolderHandle;
        
        const folderHandle = await parentHandle.getDirectoryHandle(
          folder.name.replace(/[^a-zA-Z0-9-_\s]/g, ""),
          { create: true }
        );
        folderHandles.set(folder.id, folderHandle);
      }

      // Second pass: create all files
      const files = nodes.filter(n => n.type === "file" || n.type === "media");
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parentHandle = file.parentId 
          ? folderHandles.get(file.parentId) || vaultFolderHandle
          : vaultFolderHandle;

        if (file.type === "file") {
          // Create markdown file
          const fileName = file.name.endsWith(".md") ? file.name : `${file.name}.md`;
          const fileHandle = await parentHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          
          // Add frontmatter with tags if present
          let content = file.content;
          if (file.tags && file.tags.length > 0) {
            const frontmatter = `---\ntags: [${file.tags.join(", ")}]\n---\n\n`;
            content = frontmatter + content;
          }
          
          await writable.write(content);
          await writable.close();
        } else if (file.type === "media" && file.dataUrl) {
          // Create media file from dataUrl
          const extension = getExtensionFromMimeType(file.mimeType || "");
          const fileName = file.name.includes(".") ? file.name : `${file.name}${extension}`;
          const fileHandle = await parentHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          
          // Convert dataUrl to blob
          const response = await fetch(file.dataUrl);
          const blob = await response.blob();
          
          await writable.write(blob);
          await writable.close();
        }

        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      // Create .vaultconfig file
      const configHandle = await vaultFolderHandle.getFileHandle(".vaultconfig", { create: true });
      const configWritable = await configHandle.createWritable();
      await configWritable.write(JSON.stringify({
        name: vaultName,
        exportedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        version: "1.0"
      }, null, 2));
      await configWritable.close();

      setStatus("success");
      toast.success(`Vault "${vaultName}" exported successfully!`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      console.error("Export error:", error);
      setStatus("error");
      toast.error("Failed to export vault: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const getExtensionFromMimeType = (mimeType: string): string => {
    const mimeMap: Record<string, string> = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "audio/mpeg": ".mp3",
      "audio/wav": ".wav",
      "audio/ogg": ".ogg",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
    };
    return mimeMap[mimeType] || "";
  };

  const handleClose = () => {
    if (!isExporting) {
      setIsOpen(false);
      setStatus("idle");
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export to File System
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOutput className="w-5 h-5" />
            Save Vault Permanently
          </DialogTitle>
          <DialogDescription>
            Export your In-Memory vault to your local file system for permanent storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "idle" && (
            <>
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">What will be exported:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {nodes.filter(n => n.type === "file").length} notes as Markdown files</li>
                  <li>• {nodes.filter(n => n.type === "folder").length} folders (structure preserved)</li>
                  <li>• {nodes.filter(n => n.type === "media").length} media files</li>
                  <li>• Tags preserved in YAML frontmatter</li>
                </ul>
              </div>

              {!checkFileSystemAccess() && (
                <div className="rounded-lg border border-destructive p-4 text-sm text-destructive">
                  Your browser doesn't support the File System Access API. 
                  Please use Chrome, Edge, or another Chromium-based browser.
                </div>
              )}

              <Button 
                onClick={exportToFileSystem} 
                disabled={!checkFileSystemAccess()}
                className="w-full"
              >
                <FolderOutput className="w-4 h-4 mr-2" />
                Choose Location & Export
              </Button>
            </>
          )}

          {status === "exporting" && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Exporting vault...</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-medium text-green-600">Export Complete!</h4>
                <p className="text-sm text-muted-foreground">
                  Your vault has been saved to your local file system.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-medium text-destructive">Export Failed</h4>
                <p className="text-sm text-muted-foreground">
                  There was an error exporting your vault. Please try again.
                </p>
              </div>
              <Button onClick={() => setStatus("idle")} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
