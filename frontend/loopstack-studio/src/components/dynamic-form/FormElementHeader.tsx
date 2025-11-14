import React from 'react';

interface FormHeaderProps {
  title?: string;
  description?: string;
  disabled?: boolean;
}

export const FormElementHeader: React.FC<FormHeaderProps> = ({ title, description }) => {
  if (!title && !description) return null;

  return (
    <>
      {title && <h1 className="text-xl font-semibold mb-2">{title}</h1>}
      {description && <p className="text-base text-muted-foreground">{description}</p>}
    </>
  );
};
