import Image from "next/image";
import WelcomeText from "./components/welcome-text";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-7xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black">
        <WelcomeText />        
      </main>
    </div>
  );
}
