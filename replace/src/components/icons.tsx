// Ícones em linha (estilo lucide), sem dependência externa.
type P = { className?: string };
const base = (d: React.ReactNode, className = "h-5 w-5") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{d}</svg>
);
export const IconHome = ({ className }: P) => base(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></>, className);
export const IconZap = ({ className }: P) => base(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />, className);
export const IconUsers = ({ className }: P) => base(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>, className);
export const IconPlug = ({ className }: P) => base(<><path d="M9 2v6M15 2v6" /><path d="M6 8h12v4a6 6 0 0 1-12 0V8Z" /><path d="M12 18v4" /></>, className);
export const IconInstagram = ({ className }: P) => base(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>, className);
export const IconComment = ({ className }: P) => base(<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12Z" />, className);
export const IconSend = ({ className }: P) => base(<><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>, className);
export const IconWhatsapp = ({ className }: P) => base(<><path d="M3 21l1.7-5A9 9 0 1 1 8 19.3L3 21Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.2-2-1-1 .7a4 4 0 0 1-2.2-2.2l.7-1-1-2L9 9.5Z" /></>, className);
export const IconPlus = ({ className }: P) => base(<path d="M12 5v14M5 12h14" />, className);
export const IconCheck = ({ className }: P) => base(<path d="m5 12.5 4.5 4.5L19 7.5" />, className);
export const IconAlert = ({ className }: P) => base(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>, className);
export const IconLogout = ({ className }: P) => base(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>, className);
export const IconSparkles = ({ className }: P) => base(<><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>, className);
export const IconTag = ({ className }: P) => base(<><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.3" /></>, className);
export const IconChevron = ({ className }: P) => base(<path d="m9 6 6 6-6 6" />, className);
export const IconImage = ({ className }: P) => base(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>, className);
export const IconLink = ({ className }: P) => base(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>, className);
export const IconText = ({ className }: P) => base(<><path d="M4 6h16M4 12h16M4 18h10" /></>, className);
export const IconVideo = ({ className }: P) => base(<><rect x="2" y="5" width="14" height="14" rx="3" /><path d="m16 10 6-3v10l-6-3" /></>, className);
export const IconScissors = ({ className }: P) => base(<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.6 20 18M8.6 16.4 20 6" /></>, className);
export const IconDoc = ({ className }: P) => base(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>, className);
export const IconDownload = ({ className }: P) => base(<><path d="M12 4v11m-5-5 5 5 5-5" /><path d="M4 20h16" /></>, className);
export const IconCopy = ({ className }: P) => base(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>, className);
export const IconTrash = ({ className }: P) => base(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>, className);
export const IconPlay = ({ className }: P) => base(<path d="M7 4v16l13-8z" />, className);
