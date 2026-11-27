import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { NEON_HOLE_LIFETIME_MS } from "../features/themes/neonBlackHole";

const fracturePresence = keyframes`
  0% { opacity: 1; }
  8% { opacity: 0.86; }
  35%, 86% { opacity: 0.72; }
  100% { opacity: 0; }
`;

const pressure = keyframes`
  0% { opacity: 0; }
  8% { opacity: 0.2; }
  25% { opacity: 0.83; }
  65% { opacity: 0.62; }
  85% { opacity: 0.48; }
  100% { opacity: 0; }
`;

const glassBreak = keyframes`
  from {
    opacity: 0;
    transform: translate(0) rotate(0);
  }
  15% { opacity: 1; }
  to {
    opacity: 0;
    transform: translate(var(--shard-x), var(--shard-y))
      rotate(var(--shard-angle));
  }
`;

const holeOpen = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.015) rotate(-35deg);
  }
  17% {
    opacity: 1;
    transform: scale(1.07) rotate(0);
  }
  28%, 72% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
  86% {
    opacity: 1;
    transform: scale(0.13) rotate(15deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.015) rotate(15deg);
  }
`;

const holeSpin = keyframes`
  to { rotate: 360deg; }
`;

// Keep static styles outside rendering; per-block values use the existing CSS variables.
export const NeonHoleOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 24;
  overflow: clip;
  contain: paint;
  pointer-events: none;

  .neon-hole-pressure {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at var(--hole-x) var(--hole-y),
      transparent 15%,
      #14052640 58%,
      #01020bc2
    );
    animation: ${pressure} ${NEON_HOLE_LIFETIME_MS}ms ease-out both;
  }

  .neon-hole-core {
    position: absolute;
    left: var(--hole-x);
    top: var(--hole-y);
    translate: -50% -50%;
  }

  .neon-hole-fracture {
    position: absolute;
    inset: 0;
    animation: ${fracturePresence} ${NEON_HOLE_LIFETIME_MS}ms linear both;
  }

  .neon-hole-fracture svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .neon-glass-shadow {
    fill: #00030c99;
  }

  .neon-glass-highlight {
    opacity: 0.92;
  }

  .neon-glass-chip {
    stroke: #f1edffb0;
    stroke-width: 0.025;
    transform-box: fill-box;
    transform-origin: center;
    animation: ${glassBreak} var(--shard-duration) ease-out var(--shard-delay)
      both;
  }

  .neon-hole-core {
    z-index: 2;
    width: var(--hole-size);
    aspect-ratio: 1;
    border-radius: 50%;
    background: #01020a;
    box-shadow:
      0 0 5px 2px #d5afff,
      0 0 26px #9b41f2b3,
      inset 0 0 18px #3e1563;
    animation: ${holeOpen} 1850ms 370ms both;
  }

  .neon-hole-disk {
    position: absolute;
    inset: -22%;
    border-radius: 50%;
    background: conic-gradient(
      from 20deg,
      transparent,
      #54208c66,
      #a266fa99,
      #f4c9ff,
      transparent 40%,
      #7455d244,
      #65d9f4bb,
      transparent 80%
    );
    mask-image: radial-gradient(
      ellipse,
      transparent 47%,
      #000 49%,
      #000 53%,
      transparent 70%
    );
    animation: ${holeSpin} 1800ms linear infinite;
  }

  .neon-hole-tile {
    position: absolute;
    border-radius: 3px;
    background: #02050b;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--theme-tile-color) 50%, white),
      inset 0 0 0 2px var(--theme-tile-color),
      0 0 7px color-mix(in srgb, var(--theme-tile-color) 70%, transparent);
  }

  .neon-hole-tile[data-special] {
    background: radial-gradient(
      ellipse at 35% 28%,
      color-mix(in srgb, var(--theme-tile-color) 48%, white),
      var(--theme-tile-color)
    );
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;
