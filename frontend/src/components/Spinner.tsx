interface SpinnerProps {
  size?: number;
}

export default function Spinner({ size = 22 }: SpinnerProps) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Carregando">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
