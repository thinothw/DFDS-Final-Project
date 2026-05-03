import './GlassCard.css';

/**
 * Reusable frosted-glass card.
 * Pass `className` for layout / spacing overrides.
 * Pseudo-element styles live in GlassCard.css.
 */
export default function GlassCard({ children, className = '', style = {} }) {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {children}
    </div>
  );
}
