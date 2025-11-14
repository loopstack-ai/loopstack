import React from 'react';
import { Button } from '../ui/button';

interface IconButtonConfirmProps {
  icon: React.ReactNode;
  onConfirm: () => void;
  loading: boolean;
}

const IconButtonSimple: React.FC<IconButtonConfirmProps> = ({ icon, onConfirm, loading }) => {
  const handleClick = () => {
    onConfirm();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="h-8 w-8 p-0"
    >
      {icon}
    </Button>
  );
};

export default IconButtonSimple;
