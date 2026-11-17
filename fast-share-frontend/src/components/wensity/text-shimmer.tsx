"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextShimmerProps {
  /** The string to render. */
  text: string;
  /** Tag rendered as the outer element. */
  as?: keyof React.JSX.IntrinsicElements;
  /** Full sweep cycle duration in seconds. Lower = faster. Default: 2s. */
  duration?: number;
  /** Resting fill color. Defaults to a theme-aware muted tone. */
  baseColor?: string;
  /** Bright highlight color. Defaults to a theme-aware foreground tone. */
  shimmerColor?: string;
  /** Band half-width scale (8–60). Converted to px from text length so the shine stays proportional. */
  spread?: number;
  /** Gradient angle in degrees (0 = left→right, 90 = top→bottom). */
  angle?: number;
  /** Sweep travel direction. */
  direction?: "left" | "right";
  /** Hold at the end of each sweep before restarting, in seconds. */
  delay?: number;
  /** Ping-pong the sweep instead of looping in one direction. */
  yoyo?: boolean;
  /** Pause the loop while the pointer is over the text. */
  pauseOnHover?: boolean;
  /**
   * Force the infinite loop paused. When omitted, the loop runs forever while
   * visible and auto-pauses when off-screen or the tab is hidden.
   */
  paused?: boolean;
  /** Optional Tailwind class for size, weight, tracking, etc. */
  className?: string;
}

const BASE_STYLE_ID = "wensity-text-shimmer-base";
const registeredDelays = new Set<string>();

/**
 * TextShimmer
 *
 * Infinite headline shimmer. Dual-layer paint: a solid base fill plus a
 * moving transparent→shine→transparent band, clipped with `background-clip:
 * text`. Only `background-position` animates — no layout thrash, no
 * per-character DOM, no Motion/rAF loop.
 *
 * Motion contract:
 * - Loop is CSS `linear infinite` (or `alternate` when yoyo).
 * - Default duration is 2s for a clear, readable sweep.
 * - Auto-pauses off-screen / hidden tabs via `animation-play-state` (no re-render).
 * - Optional hover pause via the same play-state path.
 * - Honours `prefers-reduced-motion` in CSS with a static highlight fill.
 */
export function TextShimmer({
  text,
  as = "span",
  duration = 2,
  baseColor,
  shimmerColor,
  spread = 22,
  angle = 90,
  direction = "left",
  delay = 0,
  yoyo = false,
  pauseOnHover = false,
  paused,
  className,
}: TextShimmerProps) {
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const pausedPropRef = React.useRef(paused);
  const hoverPausedRef = React.useRef(false);
  const inViewRef = React.useRef(true);
  pausedPropRef.current = paused;

  const safeDuration = Math.max(2, duration);
  const safeDelay = Math.max(0, delay);
  const totalDuration = safeDuration + safeDelay;
  const sweepEnd = safeDelay > 0 ? Math.round((safeDuration / totalDuration) * 1000) / 10 : 100;
  const delayKey = String(sweepEnd);

  React.useLayoutEffect(() => {
    ensureBaseStyles();
    ensureDelayKeyframes(delayKey, sweepEnd);
  }, [delayKey, sweepEnd]);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    let pageVisible = document.visibilityState !== "hidden";

    const syncPlayState = () => {
      const forced = pausedPropRef.current;
      const autoPause = !(inViewRef.current && pageVisible);
      const shouldPause =
        forced === true ||
        hoverPausedRef.current ||
        (forced !== false && autoPause);
      node.dataset.shimmerPaused = shouldPause ? "true" : "false";
    };

    if (paused === true) {
      syncPlayState();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries.some((entry) => entry.isIntersecting);
        syncPlayState();
      },
      { threshold: 0.01 },
    );

    const onVisibility = () => {
      pageVisible = document.visibilityState !== "hidden";
      syncPlayState();
    };

    if (paused !== false) {
      io.observe(node);
      document.addEventListener("visibilitychange", onVisibility);
    }

    syncPlayState();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused]);

  const Tag = as as unknown as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & {
      ref?: React.RefCallback<HTMLElement | null>;
      "data-shimmer-paused"?: "true" | "false";
      "data-shimmer-yoyo"?: "true" | "false";
      "data-shimmer-direction"?: "left" | "right";
      "data-shimmer-delay"?: string;
    }
  >;

  const clampedSpread = Math.min(60, Math.max(8, spread));
  // Length-aware band: default ~2px per character.
  const bandPx = Math.max(8, Math.round((text.length || 1) * (clampedSpread / 11)));

  const syncHoverPause = (next: boolean) => {
    hoverPausedRef.current = next;
    const node = nodeRef.current;
    if (!node) return;

    const forced = pausedPropRef.current;
    if (forced === true) {
      node.dataset.shimmerPaused = "true";
      return;
    }
    if (forced === false) {
      node.dataset.shimmerPaused = next ? "true" : "false";
      return;
    }

    if (next) {
      node.dataset.shimmerPaused = "true";
      return;
    }

    const pageVisible = document.visibilityState !== "hidden";
    node.dataset.shimmerPaused =
      inViewRef.current && pageVisible ? "false" : "true";
  };

  return (
    <Tag
      ref={(node) => {
        nodeRef.current = node;
      }}
      data-shimmer-paused={paused === true ? "true" : "false"}
      data-shimmer-yoyo={yoyo ? "true" : "false"}
      data-shimmer-direction={direction}
      data-shimmer-delay={delayKey}
      onMouseEnter={
        pauseOnHover
          ? () => {
              syncHoverPause(true);
            }
          : undefined
      }
      onMouseLeave={
        pauseOnHover
          ? () => {
              syncHoverPause(false);
            }
          : undefined
      }
      className={cn(
        "wensity-text-shimmer relative inline-block overflow-visible",
        "py-[0.14em] leading-[1.2]",
        "[background-size:250%_100%,auto] [background-clip:text]",
        "[background-repeat:no-repeat,padding-box]",
        "[-webkit-background-clip:text] [-webkit-text-fill-color:transparent]",
        "[box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
        "[transform:translateZ(0)] [text-wrap:balance]",
        // Theme-aware defaults (same idea as ShimmeringSkeletonWrapper).
        // Light: muted zinc base + near-black shine. Dark: soft zinc base + white shine.
        "[--wensity-shimmer-base:#a1a1aa] [--wensity-shimmer-hi:#09090b]",
        "dark:[--wensity-shimmer-base:#71717a] dark:[--wensity-shimmer-hi:#ffffff]",
        className,
      )}
      style={
        {
          ...(baseColor ? { "--wensity-shimmer-base": baseColor } : null),
          ...(shimmerColor ? { "--wensity-shimmer-hi": shimmerColor } : null),
          "--wensity-shimmer-duration": `${totalDuration}s`,
          "--wensity-shimmer-spread": `${bandPx}px`,
          // Layer 1: moving shine band. Layer 2: solid base fill.
          backgroundImage: [
            `linear-gradient(${angle}deg, transparent calc(50% - var(--wensity-shimmer-spread)), var(--wensity-shimmer-hi), transparent calc(50% + var(--wensity-shimmer-spread)))`,
            `linear-gradient(var(--wensity-shimmer-base), var(--wensity-shimmer-base))`,
          ].join(", "),
        } as React.CSSProperties
      }
    >
      {text}
    </Tag>
  );
}

function ensureBaseStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(BASE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BASE_STYLE_ID;
  style.textContent = BASE_STYLES;
  document.head.appendChild(style);
}

function ensureDelayKeyframes(delayKey: string, sweepEnd: number) {
  if (typeof document === "undefined") return;
  if (registeredDelays.has(delayKey)) return;
  registeredDelays.add(delayKey);

  const id = `wensity-text-shimmer-delay-${delayKey.replace(".", "_")}`;
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.wensity-text-shimmer[data-shimmer-delay="${delayKey}"] {
  animation-name: wensity-text-shimmer-fwd-${delayKey.replace(".", "_")};
}
.wensity-text-shimmer[data-shimmer-delay="${delayKey}"][data-shimmer-direction="right"] {
  animation-name: wensity-text-shimmer-rev-${delayKey.replace(".", "_")};
}
@keyframes wensity-text-shimmer-fwd-${delayKey.replace(".", "_")} {
  0% { background-position: 105% center, 0 0; }
  ${sweepEnd}% { background-position: -5% center, 0 0; }
  100% { background-position: -5% center, 0 0; }
}
@keyframes wensity-text-shimmer-rev-${delayKey.replace(".", "_")} {
  0% { background-position: -5% center, 0 0; }
  ${sweepEnd}% { background-position: 105% center, 0 0; }
  100% { background-position: 105% center, 0 0; }
}
`;
  document.head.appendChild(style);
}

const BASE_STYLES = `
.wensity-text-shimmer {
  animation-duration: var(--wensity-shimmer-duration, 2s);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  animation-play-state: running;
  animation-direction: normal;
}
.wensity-text-shimmer[data-shimmer-yoyo="true"] {
  animation-direction: alternate;
}
.wensity-text-shimmer[data-shimmer-direction="right"][data-shimmer-yoyo="true"] {
  animation-direction: alternate-reverse;
}
.wensity-text-shimmer[data-shimmer-paused="true"] {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .wensity-text-shimmer {
    animation: none !important;
    background-image: none !important;
    /* Use highlight token so light (ink) and dark (white) both stay readable. */
    -webkit-text-fill-color: var(--wensity-shimmer-hi) !important;
    color: var(--wensity-shimmer-hi);
  }
}
`;
