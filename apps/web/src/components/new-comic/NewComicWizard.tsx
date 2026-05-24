"use client";

import React, { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { createProjectSchema, type CreateProjectFormValues } from "../../lib/validation/form-schemas";
import { useCreateProject } from "../../lib/hooks/useCreateProject";
import { Textarea, useToast } from "@panelcraft/ui";
import { Sparkles, ArrowLeft, Loader2, Layers } from "lucide-react";
import Link from "next/link";
import styles from "./NewComicWizard.module.css";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Step-by-step onboarding creation wizard component for a new comic project.
 * Handles state validation schema and starts background generation on review trigger submission.
 * 
 * @component
 * @returns React.Element overlay step indicator, story concept prompt input, and buttons grid.
 */
export function NewComicWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const { createProject, loading: isSubmitting } = useCreateProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      prompt: "",
      panelCount: 4,
    },
  });

  const selectedPanelCount = watch("panelCount");

  const onSubmit = async (data: CreateProjectFormValues) => {
    try {
      const res = await createProject({
        prompt: data.prompt,
        panelCount: data.panelCount,
      });

      toast({
        variant: "success",
        title: "Comic project created!",
        description: "Story outline generation started in the background.",
      });

      startTransition(() => {
        router.push(`/projects/${res.projectId}`);
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: err instanceof Error ? err.message : "Could not create comic project.",
      });
    }
  };

  const samplePrompts = [
    "A futuristic detective tracks down a rogue AI hacker in a neon-drenched cyber city.",
    "A clumsy wizard accidentally drinks a potion that turns everything they touch into rubber.",
    "An explorer discovers a secret underwater civilization hidden beneath the Mariana Trench.",
  ];

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
        className={`${styles.container} relative z-10`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Step indicator */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-6">
          <div className={styles.dotInactive} />
          <div className={styles.dotActive} />
          <div className={styles.dotInactive} />
          <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-widest">
            Step 2 of 3
          </span>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className={styles.heroHeading}>Brainstorm your story.</h1>
          <p className={styles.heroSubheading}>
            Describe your comic concept and choose how many panels you'd like.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          {/* Story Prompt */}
          <motion.div variants={itemVariants} className="space-y-2">
            <label
              htmlFor="story-prompt"
              className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center justify-between"
            >
              <span>Story Concept</span>
              <span className="text-[10px] text-slate-500 font-normal lowercase">10–1000 characters</span>
            </label>
            <Textarea
              id="story-prompt"
              placeholder="Describe your comic storyline here. Mention characters, mood, setting, and key actions..."
              className={`h-32 resize-none bg-slate-900/30 border-slate-700 text-white placeholder:text-slate-500 ${
                errors.prompt ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
              {...register("prompt")}
            />
            {errors.prompt && (
              <p className="text-xs text-red-400 font-medium mt-1">{errors.prompt.message}</p>
            )}
          </motion.div>

          {/* Prompt Helper Buttons */}
          <motion.div variants={itemVariants} className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Need inspiration?</span>
            <div className="space-y-2">
              {samplePrompts.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue("prompt", sample, { shouldValidate: true })}
                  className="w-full text-left text-xs text-slate-300 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all duration-200"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </motion.div>

          {/* Panel Count Select */}
          <motion.div variants={itemVariants} className="space-y-3">
            <fieldset className="space-y-3 pt-2">
              <legend className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Number of Panels ({selectedPanelCount})</span>
              </legend>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Number of panels">
                {[1, 2, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setValue("panelCount", count, { shouldValidate: true })}
                    aria-pressed={selectedPanelCount === count}
                    className={`h-10 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                      selectedPanelCount === count
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 border-purple-500 text-white"
                        : "bg-slate-900/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </fieldset>
            {errors.panelCount && (
              <p className="text-xs text-red-400 font-medium mt-1">{errors.panelCount.message}</p>
            )}
          </motion.div>

          {/* Submit button */}
          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={isSubmitting}
            className={`w-full h-12 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 ${
              isSubmitting
                ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Begin Generation
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
