"use client";

import { motion } from "framer-motion";
import {
  Crown,
  Heart,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ThankYouPage() {
  const icons = [
    { Icon: Scissors, x: "8%", y: "12%", delay: 0 },
    { Icon: Sparkles, x: "78%", y: "14%", delay: 0.6 },
    { Icon: Wand2, x: "20%", y: "65%", delay: 1.2 },
    { Icon: Star, x: "85%", y: "65%", delay: 0.9 },
    { Icon: Crown, x: "45%", y: "10%", delay: 1.5 },
    { Icon: Heart, x: "12%", y: "80%", delay: 1.8 },
    { Icon: ShieldCheck, x: "70%", y: "82%", delay: 2.1 },
  ];

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* ÍCONES FLUTUANTES — visíveis no desktop */}
      <div className="hidden md:block">
        {icons.map(({ Icon, x, y, delay }, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 0.35, y: -40 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
              delay,
            }}
            className="pointer-events-none absolute"
            style={{
              left: x,
              top: y,
            }}
          >
            <Icon className="text-primary/70 h-24 w-24" strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>

      {/* ÍCONES FLUTUANTES — adaptados e menores no mobile */}
      <div className="block md:hidden">
        {icons.map(({ Icon, x, y, delay }, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 0.25, y: -30 }}
            transition={{
              duration: 7,
              repeat: Infinity,
              repeatType: "reverse",
              delay,
            }}
            className="pointer-events-none absolute"
            style={{
              left: x,
              top: y,
            }}
          >
            <Icon className="text-primary/80 h-16 w-16" strokeWidth={1.7} />
          </motion.div>
        ))}
      </div>

      {/* CARD CENTRAL */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="bg-card/85 border-border/50 relative z-10 flex w-full max-w-md flex-col items-center gap-4 rounded-xl border px-8 py-10 shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          initial={{ rotate: -12, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Scissors className="text-primary animate-wiggle h-14 w-14" />
        </motion.div>

        <h1 className="text-foreground text-center text-3xl font-bold">
          Pagamento confirmado!
        </h1>

        <p className="text-muted-foreground text-center leading-relaxed">
          Sua reserva foi criada com sucesso.
          <br />
          Obrigado por escolher nossos serviços!
        </p>

        <Link href="/appointments" className="w-full">
          <Button className="text-primary-foreground w-full rounded-2xl py-6 text-lg">
            Ver meus agendamentos
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
