import React, { useEffect } from 'react';
import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';

type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface BaseSnackbarProps {
  message?: string | null;
  variant?: ToastVariant;
  show?: boolean;
  icon?: React.ReactNode;
  duration?: number;
  position?: ExternalToast['position'];
  id?: string | number;
  onDismiss?: () => void;
}

const Snackbar: React.FC<BaseSnackbarProps> = ({
  message,
  variant = 'info',
  show = true,
  icon,
  duration = 4000,
  position = 'bottom-center',
  id,
  onDismiss
}) => {
  useEffect(() => {
    if (!message || !show) {
      if (id && !show) {
        toast.dismiss(id);
        onDismiss?.();
      }
      return;
    }

    const toastOptions: ExternalToast = {
      duration,
      position,
      id,
      ...(icon && { icon })
    };

    switch (variant) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'loading':
        toast.loading(message, toastOptions);
        break;
      case 'info':
      default:
        toast(message, toastOptions);
        break;
    }
  }, [message, show, variant, icon, duration, position, id, onDismiss]);

  return null;
};

export default Snackbar;
