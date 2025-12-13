// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { SearchIcon } from "lucide-react";

// const SearchInput = () => {
//   return (
//     <div className="flex items-center gap-2">
//       <Input
//         type="text"
//         placeholder="Pesquise serviços ou barbearias..."
//         className="border-border rounded-full"
//       />
//       <Button variant="default" size="icon" className="rounded-full">
//         <SearchIcon />
//       </Button>
//     </div>
//   );
// };

// export default SearchInput;

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

const SearchInput = () => {
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (!value.trim()) return;
    router.push(`/search?query=${encodeURIComponent(value.trim())}`);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Pesquise serviços ou barbearias..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleEnter}
        className="border-border rounded-full"
      />

      <Button
        variant="default"
        size="icon"
        className="rounded-full"
        onClick={handleSearch}
      >
        <SearchIcon />
      </Button>
    </div>
  );
};

export default SearchInput;
