
import { useEffect, useRef } from 'react';

export default function CursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    if (!finePointer.matches || reducedMotion.matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    let particles = [];
    let animationFrame = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let lastX = null;
    let lastY = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createParticle = (x, y) => {
      particles.push({
        x,
        y,
        radius: Math.random() * 2 + 1,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.02,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
      });

      if (particles.length > 100) {
        particles.shift();
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles = particles.filter((p) => p.alpha > 0);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        // Respect current theme color via CSS variable
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary').trim() || '#059669';
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(
            p.x,
            p.y,
            p.radius * Math.max(0, p.alpha),
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });

      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        animationFrame = null;
      }
    };

    const startAnimation = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    const handleMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;

      if (lastX === null || lastY === null) {
        createParticle(x, y);
      } else {
        const distance = Math.hypot(x - lastX, y - lastY);
        const steps = Math.max(1, Math.floor(distance / 6));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;

          createParticle(
              lastX + (x - lastX) * t,
              lastY + (y - lastY) * t
          );
        }
      }

      lastX = x;
      lastY = y;

      startAnimation();
    };

    const handleLeave = () => {
      lastX = null;
      lastY = null;
    };

    resize();

    window.addEventListener('resize', resize);
    document.addEventListener('pointermove', handleMove, {
      passive: true,
    });
    document.documentElement.addEventListener('pointerleave', handleLeave);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener(
          'pointerleave',
          handleLeave
      );

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      particles = [];
    };
  }, []);

  return (
      <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
      />
  );
}
