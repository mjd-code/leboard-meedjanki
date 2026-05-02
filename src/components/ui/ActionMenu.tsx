import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { SimpleMenu } from './SimpleMenu';

export function ActionMenu({ onEdit, onDelete, placement = 'bottom-end' }: { onEdit: () => void, onDelete: () => void, placement?: 'bottom-end' | 'top-center' }) {
  const options = [
    {
      label: 'Edit',
      onClick: onEdit,
      icon: <Edit className="h-4 w-4 text-primary" />
    },
    {
      label: 'Delete',
      onClick: onDelete,
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const
    }
  ];

  return <SimpleMenu options={options} align={placement === 'top-center' ? 'left' : 'right'} />;
}
