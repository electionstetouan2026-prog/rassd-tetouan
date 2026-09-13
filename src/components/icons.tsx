// أيقونات SVG بسيطة (inline، بلا مكتبات خارجية) — 24x24، stroke-based

type IconProps = { className?: string };

export function IconDashboard({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconPeople({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.5-5.8 5.5-5.8s5.5 2.2 5.5 5.8" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.7 14.5c2.6.2 4.8 2.2 4.8 5.5" />
    </svg>
  );
}

export function IconMap({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13l-5.5 2-6-2Z" />
      <path d="M9 4.5v13" />
      <path d="M15 6.5v13" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

export function IconTasks({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8h8M8 12.5h8M8 17h5" />
      <path d="M8 3.5V2M16 3.5V2" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4.5 6v6c0 5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.5 7.5-9.5V6L12 3Z" />
      <path d="M9 12.2l2 2 4-4.2" />
    </svg>
  );
}

export function IconFlame({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5c1.2 3-1.5 4.5-1.5 7 0 1.4 1 2.5 2.5 2.5s2.5-1.4 2.2-3.2c2 1.5 3.3 4 3.3 6.2 0 4-3.1 7-6.5 7s-6.5-3-6.5-7c0-3.8 2.6-6.4 4.5-9 .6-.8 1.6-2 2-3.5Z" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4h3.2l1.5 4.2-2 1.8a12 12 0 0 0 5.8 5.8l1.8-2 4.2 1.5v3.2c0 1-.9 1.8-1.9 1.7-6.5-.6-11.6-5.7-12.2-12.2C4 6.4 3.5 4 4.5 4Z" />
    </svg>
  );
}

export function IconHeartHand({ className }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 8.5c-.6-1.6-2-2.5-3.5-2.5-2 0-3.5 1.6-3.5 3.6 0 2.7 3 4.8 6.5 7.9 1.5-1.3 2.9-2.5 4-3.6" />
      <path d="M2.5 17.5 5 15l2.2 1.6c.5.3 1.1.4 1.6.2l3-1c.6-.2 1.3 0 1.7.5.5.6.3 1.5-.4 1.8l-3.6 1.6c-.9.4-1.9.4-2.8 0L2.5 17.5Z" />
      <path d="M15.5 15.5 18 13l3.5 2.2" />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
