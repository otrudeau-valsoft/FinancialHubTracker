import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-gray-400 mt-2">{description}</p>}
    </div>
  );
}