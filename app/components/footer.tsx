const Footer = () => {
  return (
    <footer className="bg-muted-background flex flex-col items-center justify-center gap-2 bg-white py-6 text-center md:flex-row md:gap-6">
      <p className="text-foreground text-sm font-semibold">
        &copy; 2025 CutWave
      </p>

      <span className="text-muted-foreground hidden md:inline">•</span>

      <p className="text-foreground text-sm font-medium">
        Feito por Magaiver Magalhães
      </p>

      <span className="text-muted-foreground hidden md:inline">•</span>

      <p className="text-muted-foreground text-xs md:text-sm">
        Todos os direitos reservados.
      </p>
    </footer>
  );
};

export default Footer;
