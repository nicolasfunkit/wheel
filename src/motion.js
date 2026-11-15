// True when the system asks for reduced motion: decorative effects are then skipped.
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
