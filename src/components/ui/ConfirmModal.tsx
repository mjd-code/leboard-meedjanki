import React from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/80 animate-in fade-in-0" onClick={onCancel} />
            <div className="relative z-10 grid w-full max-w-sm gap-6 rounded-lg bg-background p-8 text-center shadow-soft border-0">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground">{title}</h2>
                <p className="text-base text-muted-foreground">{message}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-center w-full mt-2">
                <Button variant="secondary" className="rounded-xl h-12 flex-1 font-bold" onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="destructive" className="rounded-xl h-12 flex-1 font-bold shadow-soft shadow-destructive/20" onClick={onConfirm}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DrawerContent className="rounded-t-[2rem] border-0 outline-none !z-[5000]">
        <DrawerHeader className="text-left mt-2 px-6">
          <DrawerTitle className="text-2xl font-black text-foreground">{title}</DrawerTitle>
          <DrawerDescription className="text-base text-muted-foreground mt-2">{message}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-4 px-6 pb-8 flex-col gap-3">
          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-xl shadow-soft shadow-destructive/20 text-base font-bold" 
            onClick={onConfirm}
          >
            Confirm
          </Button>
          <DrawerClose asChild>
            <Button variant="secondary" className="w-full h-12 rounded-xl text-base font-bold" onClick={onCancel}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
