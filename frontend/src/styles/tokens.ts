/**
 * LECASU ERP - DESIGN SYSTEM TOKENS
 * Strict 8-Point Grid System & Brand Standards
 * 
 * Rules:
 * - Micro spacing: 4px, 8px
 * - Inputs / Buttons: 12px, 16px (h-8: 32px, h-10: 40px, h-12: 48px)
 * - Containers / Cards: 16px, 20px, 24px
 * - Screen breathers / Page layout: 24px, 32px
 * - Sidebar: 256px (expanded), 68px (collapsed)
 * - Header: 64px
 * - Main Container Max Width: 1440px
 */

export const SPACING_TOKENS = {
  // Micro
  micro4: '4px',    // 0.25rem - p-1, gap-1, m-1
  micro8: '8px',    // 0.5rem  - p-2, gap-2, m-2
  
  // Compact / Input / Button
  compact12: '12px', // 0.75rem - px-3, py-3, gap-3
  base16: '16px',    // 1rem    - p-4, px-4, py-4, gap-4
  
  // Containers & Cards
  card20: '20px',    // 1.25rem - p-5, gap-5
  card24: '24px',    // 1.5rem  - p-6, gap-6
  
  // Screen Breathers / Sections
  section32: '32px', // 2rem    - p-8, gap-8
  section48: '48px', // 3rem    - p-12
  section64: '64px', // 4rem    - p-16
} as const;

export const LAYOUT_TOKENS = {
  sidebarExpandedWidth: '256px', // w-64
  sidebarCollapsedWidth: '68px',  // w-[68px]
  headerHeight: '64px',          // h-16
  maxContentWidth: '1440px',     // max-w-[1440px]
  desktopPagePadding: '24px',    // p-6
  compactPagePadding: '16px',    // p-4
  tableRowMinHeight: '48px',     // h-12
  tableRowMaxHeight: '52px',     // py-3.5
  tableCellPaddingX: '16px',     // px-4
} as const;

export const COMPONENT_SIZES = {
  button: {
    sm: { height: '32px', px: '12px', fontSize: '12px' }, // h-8 px-3 text-xs
    md: { height: '40px', px: '16px', fontSize: '13px' }, // h-10 px-4 text-[13px]
    lg: { height: '48px', px: '20px', fontSize: '14px' }, // h-12 px-5 text-sm
    iconSm: { size: '32px' }, // w-8 h-8
    iconMd: { size: '40px' }, // w-10 h-10
  },
  input: {
    height: '40px',    // h-10
    paddingX: '12px',  // px-3
    labelGap: '4px',   // mb-1
    errorGap: '4px',   // mt-1
    fontSize: '13px',  // text-sm / text-[13px]
  },
  card: {
    radius: '12px',    // rounded-xl (0.75rem)
    padding: '24px',   // p-6
    paddingCompact: '20px', // p-5
    borderWidth: '1px',
  },
  table: {
    headerHeight: '40px', // h-10
    rowHeight: '48px',    // h-12
    cellPaddingX: '16px', // px-4
  }
} as const;

export const BRAND_COLORS = {
  primary: '#FF8000',
  primaryHover: '#E67300',
  primaryActive: '#CC6600',
  primaryLight: '#FFF2E5',
  
  dark: '#101010',
  darkSurface: '#181818',
  darkCard: '#1F1F1F',
  darkBorder: '#2C2C2C',
  darkMuted: '#8E8E8E',
  
  canvas: '#F5F5F3',
  canvasSurface: '#FFFFFF',
  canvasSubtle: '#EDEDEA',
  canvasBorder: '#E2E2DE',
  canvasMuted: '#737370',
} as const;
