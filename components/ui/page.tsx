import { cn } from "@/lib/utils";

export const PageContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("space-y-5 p-5 lg:mx-auto lg:max-w-6xl", className)}>
      {children}
    </div>
  );
};

export const PageSectionTitle = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <h2 className="text-foreground text-xs font-bold uppercase">{children}</h2>
  );
};

export const PageSection = ({ children }: { children: React.ReactNode }) => {
  return <div className="space-y-3">{children}</div>;
};

export const PageSectionScroller = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="scrollbar-hide flex gap-4 overflow-x-auto lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-3">
      {children}
    </div>
  );
};
