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
      {title && <h3 className="mb-1.5 text-base font-semibold">{title}</h3>}
      {description && <p className="text-muted-foreground text-base">{description}</p>}
    </>
  );
};
