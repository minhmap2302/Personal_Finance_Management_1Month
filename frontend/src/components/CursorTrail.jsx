import { useEffect, useRef } from 'react';

export default function CursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let particles = [];
    let frame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let previous = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addParticle = (x, y) => {
      particles.push({
        x, y,
        radius: 1.5 + Math.random() * 2.2,
        alpha: 0.9,
        life: 1,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      });
      if (particles.length > 65) particles.splice(0, particles.length - 65);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles = particles.filter(p => p.life > 0.02);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.035;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.life * 0.7})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 9;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (particles.length) frame = requestAnimationFrame(animate);
      else frame = 0;
    };

    const onMove = event => {
      const point = { x: event.clientX, y: event.clientY };
      if (previous) {
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
        const count = Math.min(10, Math.max(1, Math.ceil(distance / 8)));
        for (let i = 1; i <= count; i++) {
          const t = i / count;
          addParticle(
            previous.x + (point.x - previous.x) * t,
            previous.y + (point.y - previous.y) * t
          );
        }
      } else addParticle(point.x, point.y);
      previous = point;
      if (!frame) frame = requestAnimationFrame(animate);
    };

    const onLeave = () => { previous = null; };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('blur', onLeave);
      if (frame) cancelAnimationFrame(frame);
      particles = [];
    };
  }, []);

  return <canvas ref={canvasRef} className="pfm-cursor-trail" aria-hidden="true" />;
}
