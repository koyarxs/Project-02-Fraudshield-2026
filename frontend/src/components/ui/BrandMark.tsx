interface BrandMarkProps {
  logoSrc: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'badge' | 'plain';
}

const sizeClasses = {
  sm: {
    wrapper: 'h-11 w-11 rounded-2xl',
    image: 'h-[86px] w-[86px] -translate-x-[9px] -translate-y-[4px]',
  },
  md: {
    wrapper: 'h-16 w-16 rounded-3xl',
    image: 'h-[126px] w-[126px] -translate-x-[13px] -translate-y-[6px]',
  },
  lg: {
    wrapper: 'h-20 w-20 rounded-3xl',
    image: 'h-[158px] w-[158px] -translate-x-[16px] -translate-y-[8px]',
  },
};

const plainSizeClasses = {
  sm: 'h-14 w-auto',
  md: 'h-16 w-auto',
  lg: 'h-20 w-auto',
};

export default function BrandMark({
  logoSrc,
  size = 'sm',
  className = '',
  variant = 'badge',
}: BrandMarkProps) {
  const classes = sizeClasses[size];

  if (variant === 'plain') {
    return (
      <img
        src={logoSrc}
        alt="FraudShield"
        className={`shrink-0 object-contain ${plainSizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-cyan-200/30 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 shadow-inner shadow-white/10 ${classes.wrapper} ${className}`}
    >
      <img
        src={logoSrc}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none max-w-none object-contain ${classes.image}`}
      />
    </span>
  );
}
