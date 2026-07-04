export default function Footer() {
  return (
    <footer className="border-t border-amber/20 px-6 py-10 text-center font-mono text-[11px] text-white/30">
      JARVIS AI Assistant by <span className="text-amber">Cortex</span> · erstellt von <span className="text-amber">Veylo40</span> · © {new Date().getFullYear()}
    </footer>
  );
}
