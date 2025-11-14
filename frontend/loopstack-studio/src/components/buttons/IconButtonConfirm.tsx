import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface IconButtonConfirmProps {
  icon: React.ReactNode;
  onConfirm: () => void;
  loading: boolean;
}

const IconButtonConfirm: React.FC<IconButtonConfirmProps> = ({ icon, onConfirm, loading }) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading} className="h-8 w-8 p-0">
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Button variant="ghost" size="sm" onClick={handleConfirm} className="p-2">
          Confirm
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default IconButtonConfirm;
