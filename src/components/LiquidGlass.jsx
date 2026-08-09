import React from 'react';

/**
 * LiquidGlass Component
 * SwiftUI-inspired reusable Liquid Glass container and wrapper component.
 *
 * @param {Object} props
 * @param {string} [props.as='div'] - HTML element to render (div, button, nav, etc.)
 * @param {'regular'|'thin'|'thick'} [props.variant='regular'] - Material thickness
 * @param {'capsule'|'rect'|'rect-lg'|'rect-md'|'rect-sm'|'circle'} [props.shape='rect'] - Glass geometry shape
 * @param {'cyan'|'purple'|'emerald'|'orange'|null} [props.tint=null] - Prominence color tint
 * @param {boolean} [props.interactive=false] - Enables touch/pointer reactive physics
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {React.ReactNode} props.children
 */
export default function LiquidGlass({
  as: Component = 'div',
  variant = 'regular',
  shape = 'rect',
  tint = null,
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const variantClass = `liquid-glass-${variant}`;
  const shapeClass = `liquid-glass-${shape}`;
  const tintClass = tint ? `liquid-glass-tint-${tint}` : '';
  const interactiveClass = interactive ? 'liquid-glass-interactive' : '';

  const combinedClasses = [
    'liquid-glass',
    variantClass,
    shapeClass,
    tintClass,
    interactiveClass,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={combinedClasses} data-liquid-glass={variant} {...rest}>
      {children}
    </Component>
  );
}

/**
 * GlassEffectContainer Component
 * Groups multiple liquid glass items so their optical backgrounds and borders harmoniously blend.
 */
export function GlassEffectContainer({
  as: Component = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Component className={`liquid-glass-container ${className}`} {...rest}>
      {children}
    </Component>
  );
}
