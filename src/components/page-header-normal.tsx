import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, children, actions }: PageHeaderProps) {
  return (
    <div className="mt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
