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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
      <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <AlertDialogContent className="sm:rounded-lg shadow-soft border-0 max-w-sm p-8 text-center sm:gap-6">
          <AlertDialogHeader className="sm:text-center p-0 space-y-2">
            <AlertDialogTitle className="text-2xl font-black text-foreground">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center flex-col sm:flex-row gap-3 sm:space-x-0 w-full mt-2">
            <AlertDialogCancel className="rounded-xl h-12 flex-1 m-0 bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 border-0" onClick={onCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl h-12 flex-1 m-0 bg-destructive text-destructive-foreground font-bold shadow-soft shadow-destructive/20 hover:bg-destructive/90" 
              onClick={onConfirm}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DrawerContent className="rounded-t-[2rem] border-0 outline-none">
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
