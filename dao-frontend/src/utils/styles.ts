import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for proper Tailwind class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Button variant styles for consistent design
 */
export const buttonVariants = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  success: 'action-btn action-btn-vote-yes',
  error: 'action-btn action-btn-vote-no',
  execute: 'action-btn action-btn-execute'
};

/**
 * Card variant styles
 */
export const cardVariants = {
  default: 'dao-card',
  primary: 'dao-card-primary',
  stats: 'dao-card-stats',
  interactive: 'dao-card card-interactive'
};

/**
 * Status indicator styles
 */
export const statusVariants = {
  active: 'proposal-status active',
  passed: 'proposal-status passed',
  rejected: 'proposal-status rejected',
  executed: 'proposal-status executed'
};

/**
 * Animation classes for consistent motion
 */
export const animationClasses = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  scaleIn: 'animate-scale-in',
  fadeInUp: 'animate-fade-in-up'
};

/**
 * Typography scale classes
 */
export const typographyClasses = {
  display: 'text-display',
  h1: 'text-heading-1',
  h2: 'text-heading-2',
  h3: 'text-heading-3',
  bodyLg: 'text-body-lg',
  body: 'text-body',
  bodySm: 'text-body-sm',
  caption: 'text-caption'
};

/**
 * Spacing utilities following our design system
 */
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
  '5xl': '8rem'    // 128px
};

/**
 * Generate responsive grid classes
 */
export const gridClasses = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 md:grid-cols-2',
  '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

/**
 * Common layout classes
 */
export const layoutClasses = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-8 md:py-12 lg:py-16',
  card: 'dao-card p-6',
  modal: 'modal-overlay fixed inset-0 z-50 flex items-center justify-center',
  modalContent: 'modal-content max-w-md w-full mx-4'
};

/**
 * Form input classes
 */
export const inputClasses = {
  default: 'form-input',
  error: 'form-input input-error',
  textarea: 'form-textarea'
};

/**
 * Loading state classes
 */
export const loadingClasses = {
  spinner: 'loading-spinner',
  dots: 'loading-dots',
  skeleton: 'skeleton',
  skeletonText: 'skeleton-text',
  skeletonAvatar: 'skeleton-avatar'
};

/**
 * Utility to get proposal status styling
 */
export function getProposalStatusStyle(status: number) {
  switch (status) {
    case 0:
      return statusVariants.active;
    case 1:
      return statusVariants.passed;
    case 2:
      return statusVariants.rejected;
    case 3:
      return statusVariants.executed;
    default:
      return statusVariants.active;
  }
}

/**
 * Utility to get proposal card styling
 */
export function getProposalCardStyle(status: number) {
  const baseClass = 'proposal-card';
  switch (status) {
    case 0:
      return `${baseClass} active`;
    case 1:
      return `${baseClass} passed`;
    case 2:
      return `${baseClass} rejected`;
    case 3:
      return `${baseClass} executed`;
    default:
      return baseClass;
  }
}

/**
 * Generate staggered animation delays for lists
 */
export function getStaggerDelay(index: number, baseDelay = 100) {
  return {
    '--stagger': index,
    animationDelay: `${index * baseDelay}ms`
  } as React.CSSProperties;
}

/**
 * Responsive breakpoints
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

/**
 * Common shadow utilities
 */
export const shadows = {
  soft: 'shadow-soft',
  medium: 'shadow-medium',
  large: 'shadow-large',
  glow: 'shadow-glow',
  glowLg: 'shadow-glow-lg'
};

/**
 * Color palette utilities
 */
export const colors = {
  primary: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1'
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a'
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706'
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626'
  }
};