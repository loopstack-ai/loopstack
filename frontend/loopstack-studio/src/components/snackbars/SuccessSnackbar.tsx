import React from 'react';
import Snackbar from './Snackbar';

interface NotificationSnackbarProps {
  notification?: { message: string; id: any };
}

const SuccessSnackbar: React.FC<NotificationSnackbarProps> = ({ notification }) => {
  return (
    <Snackbar
      message={notification?.message}
      variant="success"
      duration={6000}
      id={notification?.id}
      show={!!notification}
    />
  );
};

export default SuccessSnackbar;
