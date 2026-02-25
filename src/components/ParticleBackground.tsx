import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useState } from "react";
import particleOptions from "../styles/particles.json";

const GLOBAL_PARTICLE_OPTIONS = {
  ...particleOptions,
  fullScreen: {
    enable: false,
    zIndex: 0
  }
};

export function ParticleBackground() {
  const [isEngineReady, setIsEngineReady] = useState(false);

  useEffect(() => {
    void initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setIsEngineReady(true);
    });
  }, []);

  return (
    <div className="particle-background" aria-label="particle-background-layer">
      {isEngineReady ? (
        <Particles
          id="global-particle-background"
          className="particle-background__canvas"
          options={GLOBAL_PARTICLE_OPTIONS}
        />
      ) : null}
      <div className="particle-background__overlay" />
    </div>
  );
}
