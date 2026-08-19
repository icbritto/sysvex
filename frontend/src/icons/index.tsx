import { ReactNode, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Base({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1h1.5A1.5 1.5 0 0 1 20 10.5v6A1.5 1.5 0 0 1 18.5 18H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function CashFlowIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="3" y1="20" x2="21" y2="20" />
      <line x1="7" y1="20" x2="7" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="17" y1="20" x2="17" y2="15" />
    </Base>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polyline points="3,17 9,11 13,15 21,6" />
      <polyline points="15,6 21,6 21,12" />
    </Base>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 8H6.2" />
    </Base>
  );
}

export function FactoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="3" width="14" height="17" rx="1" />
      <line x1="9" y1="7" x2="9" y2="9" />
      <line x1="15" y1="7" x2="15" y2="9" />
      <line x1="9" y1="12" x2="9" y2="14" />
      <line x1="15" y1="12" x2="15" y2="14" />
      <line x1="10" y1="20" x2="10" y2="17" />
      <line x1="14" y1="20" x2="14" y2="17" />
    </Base>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5Z" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </Base>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.2" cy="9" r="2.3" />
      <path d="M15.6 14.3c2.4.5 4.2 2.6 4.2 5.1" />
    </Base>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 21 7.5v9L12 21 3 16.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </Base>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4 22 20H2Z" />
      <line x1="12" y1="10" x2="12" y2="15" />
      <circle cx="12" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon points="12,3 21,8.5 12,14 3,8.5" />
      <polyline points="3,14 12,19.5 21,14" />
    </Base>
  );
}

export function ClipboardListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.3" width="6" height="3" rx="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </Base>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Base>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <polyline points="9,12 11.2,14.2 15.5,9.5" />
    </Base>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </Base>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-6h4v6" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="20" y1="20" x2="15.3" y2="15.3" />
    </Base>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </Base>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="6" x2="21" y2="6" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="18" x2="21" y2="18" />
    </Base>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon points="3,4 21,4 14,12.5 14,19 10,21 10,12.5" />
    </Base>
  );
}

export function InspectionIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v4h4" />
      <circle cx="11" cy="14" r="3" />
      <line x1="13.3" y1="16.3" x2="16" y2="19" />
    </Base>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polyline points="6,9 12,15 18,9" />
    </Base>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" />
      <line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" />
      <line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
    </Base>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 14.2A8.3 8.3 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z" />
    </Base>
  );
}

const GEAR_TEETH_ANGLES = [0, 60, 120, 180, 240, 300];

export function GearIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      {GEAR_TEETH_ANGLES.map((angle) => (
        <rect key={angle} x="10.9" y="5.2" width="2.2" height="3" rx="0.5" transform={`rotate(${angle} 12 12)`} />
      ))}
    </Base>
  );
}

export function PowerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v7" />
      <path d="M7 6.7a7 7 0 1 0 10 0" />
    </Base>
  );
}

const STAR_POINTS = '12,3 14.6,9.3 21.5,9.8 16.2,14.2 17.9,21 12,17.3 6.1,21 7.8,14.2 2.5,9.8 9.4,9.3';

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Base {...props}>
      <polygon points={STAR_POINTS} fill={filled ? 'currentColor' : 'none'} />
    </Base>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11,6 5,12 11,18" />
    </Base>
  );
}

export function EyeIcon({ off, ...props }: IconProps & { off?: boolean }) {
  if (off) {
    return (
      <Base {...props}>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9.5 4.5 10.5 7-.4.9-1 2-1.9 3.1M6.2 6.6C4 8.1 2.5 10.2 1.5 12c1.4 3 5.3 7 10.5 7 1.6 0 3.1-.4 4.4-1" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </Base>
    );
  }
  return (
    <Base {...props}>
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polyline points="4,7 7,4 10,7" />
      <line x1="7" y1="4" x2="7" y2="20" />
      <polyline points="20,17 17,20 14,17" />
      <line x1="17" y1="4" x2="17" y2="20" />
    </Base>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </Base>
  );
}

// Ícones de tiles (linhas de negócio e páginas), indexados pela chave
// semântica salva em GroupTile.icon / App.icon — front e back compartilham
// o mesmo vocabulário de nomes para as 7 linhas de negócio.
export const TILE_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  wallet: WalletIcon,
  cashflow: CashFlowIcon,
  'trending-up': TrendingUpIcon,
  cart: CartIcon,
  factory: FactoryIcon,
  receipt: ReceiptIcon,
  users: UsersIcon,
  package: PackageIcon,
  'alert-triangle': AlertTriangleIcon,
  layers: LayersIcon,
  'clipboard-list': ClipboardListIcon,
  user: UserIcon,
  'shield-check': ShieldCheckIcon,
  monitor: MonitorIcon,
  gear: GearIcon,
  truck: TruckIcon,
};

export function TileIcon({ name, ...props }: IconProps & { name: string }) {
  const Component = TILE_ICONS[name];
  if (!Component) return null;
  return <Component {...props} />;
}
