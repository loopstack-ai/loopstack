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
      {title && <h1 className="mb-2 text-xl font-semibold">{title}</h1>}
      {description && <p className="text-muted-foreground text-base">{description}</p>}
    </>
  );
};
