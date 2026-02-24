const PARTICLE_COUNT = 24;

export function ParticleBackground() {
  return (
    <div className="particle-background" aria-label="particle-background-layer">
      <div className="particle-background__overlay" />
      {Array.from({ length: PARTICLE_COUNT }, (_value, index) => (
        <span
          // Stable keys keep animation nodes predictable across renders.
          key={`particle-${index + 1}`}
          className="particle-background__particle"
        />
      ))}
    </div>
  );
}
