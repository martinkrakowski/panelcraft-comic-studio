"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Page() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        className="w-full max-w-lg mb-8 px-4 relative z-10"
      >
        <Link href="/new" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 group">
          <ArrowLeft className="h-4 w-4 mr-2 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back
        </Link>
      </motion.div>

      <motion.div
        className="w-[90%] sm:w-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] text-center relative z-10 px-4 sm:px-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Step indicator */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-2 rounded-full bg-slate-700" />
          <div className="w-8 h-2 rounded-full bg-slate-700" />
          <div className="w-8 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600" />
          <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-widest">
            Step 3 of 3
          </span>
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-semibold text-white mb-2">
            Template Library
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Choose from pre-designed templates to jumpstart your project.
          </p>
        </motion.div>

        {/* Placeholder */}
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-slate-700 bg-slate-900/30 p-12 text-center"
        >
          <p className="text-slate-400 text-sm mb-4">
            Templates are coming soon.
          </p>
          <p className="text-slate-500 text-xs">
            This feature will allow you to explore and customize pre-made comic layouts.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
