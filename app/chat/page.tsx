import { Suspense } from "react";
import ChatClient from "./ChatClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Carregando chat...</div>}>
      <ChatClient />
    </Suspense>
  );
}
