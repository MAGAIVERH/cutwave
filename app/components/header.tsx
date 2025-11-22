import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react";
import Image from "next/image";

const Header = () => {
  return (
    <header className="flex items-center justify-between px-5 py-6">
      <Image src="/logo.svg" alt="cutwave" width={100} height={26.09} />
      <Button variant="outline" size="icon">
        <MenuIcon />
      </Button>
    </header>
  );
};

export default Header;
