import React, { useRef, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { uploadImageWithCompression } from '@/lib/uploadImage';
import { toast } from 'sonner';
import { Button } from './button';
import { ImageIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  className?: string;
  trigger?: React.ReactNode;
  aspectRatio?: number;
  maxResolution?: number; // Default 1200
  title?: string;
}

export function ImageUploader({
  onUploadSuccess,
  folder = 'uploads',
  className = '',
  trigger,
  aspectRatio, // if undefined, free crop? or default 16/9 for blog, 1/1 for avatar
  maxResolution = 1200,
  title = "Pilih Gambar"
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Always use FileReader for crop preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImage(event.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmCropAndUpload = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    
    setIsUploading(true);
    const toastId = toast.loading('Memproses dan mengunggah gambar...');

    try {
      const image = new Image();
      const croppedBlob = await Promise.race([
        new Promise<Blob>((resolve, reject) => {
          image.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = croppedAreaPixels.width;
              let height = croppedAreaPixels.height;

              // Resize logic if greater than maxResolution
              if (width > maxResolution) {
                height = Math.round((height * maxResolution) / width);
                width = maxResolution;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(
                  image,
                  croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
                  0, 0, width, height
                );
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error("Canvas toBlob failed"));
                  }
                }, 'image/webp', 0.8);
              } else {
                reject(new Error("Canvas context is null"));
              }
            } catch (err) {
              reject(err);
            }
          };
          image.onerror = () => reject(new Error("Image load error"));
          image.src = cropImage;
        }),
        new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error("Canvas Timeout")), 5000))
      ]);

      const croppedFile = new File([croppedBlob], `image_${Date.now()}.webp`, { type: 'image/webp' });
      
      // We still pass it to uploadImageWithCompression because it handles Firebase upload
      const url = await uploadImageWithCompression(croppedFile, folder);
      
      onUploadSuccess(url);
      setCropImage(null);
      toast.dismiss(toastId);
      toast.success('Gambar berhasil diunggah');
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Gagal mengunggah gambar: ' + (err.message || String(err)));
    } finally {
      setIsUploading(false);
      toast.dismiss(toastId); // Fallback to dismiss in finally unconditionally
    }
  };

  return (
    <>
      <div className={`inline-block ${className}`} onClick={() => fileInputRef.current?.click()}>
        {trigger || (
          <Button type="button" variant="outline" className="gap-2">
            <ImageIcon className="w-4 h-4" /> {title}
          </Button>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {cropImage && (
        <div className="fixed inset-0 bg-base-900/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl shadow-soft w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
          >
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Sesuaikan Gambar</h2>
              <button disabled={isUploading} onClick={() => setCropImage(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="relative h-[400px] w-full bg-black/10">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio || undefined}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-4 border-t border-border flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCropImage(null)} disabled={isUploading}>Batal</Button>
                <Button onClick={confirmCropAndUpload} disabled={isUploading}>
                  {isUploading ? 'Menyimpan...' : 'Potong & Unggah'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
