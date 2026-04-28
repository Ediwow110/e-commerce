import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';

export default function BrowseEffects() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.35 });
  const [visible, setVisible] = useState(false);
  const [pointer, setPointer] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    const onPointerMove = (event) => setPointer({ x: event.clientX, y: event.clientY });

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX }} />
      <motion.div
        className="cursor-glow"
        animate={{ x: pointer.x - 150, y: pointer.y - 150 }}
        transition={{ type: 'spring', stiffness: 55, damping: 20, mass: 0.5 }}
        aria-hidden="true"
      />
      <button
        className={`scroll-top ${visible ? 'show' : ''}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}
