import Image from "next/image";
import Header from "./components/header";
import SearchInput from "./components/search-input";
import banner2 from "../public/banner2.png";

export default function Home() {
  return (
    <div>
      <Header />
      <div className="space-y-4 px-5">
        <SearchInput />
        <Image
          src={banner2}
          alt="Agende agora!"
          sizes="100vw"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
