interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-6">
    <div className="flex items-start justify-between">
      <div>
        <h1 
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-gray-500 text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  </div>
);
