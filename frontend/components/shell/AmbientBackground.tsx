"use client";

export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="ambient-background">
      <span className="ambient-orb ambient-orb-emerald" />
      <span className="ambient-orb ambient-orb-cyan" />
      <span className="ambient-orb ambient-orb-lime" />
      <span className="ambient-noise" />
    </div>
  );
}
