interface HeadingProps {
  title: string;
  subtitle?: string;
  center?: boolean;
  className?: string;
}

export default function Heading({
  title,
  subtitle,
  center,
  className = "",
}: HeadingProps) {
  return (
    <div className={`${center ? "text-center" : "text-start"} ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
        {title}
      </h2>
      {subtitle && (
        <p className="font-normal text-neutral-500 text-sm mt-1.5 leading-relaxed max-w-[65ch]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
