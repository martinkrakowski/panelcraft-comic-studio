"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectFormValues } from "../../lib/validation/form-schemas";
import { useCreateProject } from "../../lib/hooks/useCreateProject";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Textarea, useToast } from "@panelcraft/ui";
import { Sparkles, ArrowLeft, Loader2, BookOpen, Layers } from "lucide-react";
import Link from "next/link";

export function NewComicWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const { createProject, loading: isSubmitting } = useCreateProject();
  const [, startTransition] = useTransition();

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

      // Navigate to the editor page
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors duration-200 group">
        <ArrowLeft className="h-4 w-4 mr-2 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
        Back to Dashboard
      </Link>

      <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md">
        <CardHeader className="border-b border-slate-800/40 pb-6">
          <div className="flex items-center space-x-2 text-indigo-400 mb-1">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Creation Wizard</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Create a New Comic
          </CardTitle>
          <CardDescription>
            Input your story concept. PanelCraft will outline the story, structure character models, and generate panel images sequentially.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            
            {/* Story Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Story Concept / Prompt</span>
                <span className="text-xs text-slate-500 font-normal">Min 10, Max 1000 characters</span>
              </label>
              <Textarea
                placeholder="Describe your comic storyline here. Mention characters, mood, setting, and key actions..."
                className={`h-32 resize-none ${errors.prompt ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                {...register("prompt")}
              />
              {errors.prompt && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.prompt.message}</p>
              )}
            </div>

            {/* Prompt Helper Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Need inspiration? Try one of these:</span>
              <div className="grid grid-cols-1 gap-2">
                {samplePrompts.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setValue("prompt", sample, { shouldValidate: true })}
                    className="text-left text-xs text-slate-300 bg-slate-950/40 hover:bg-slate-900 border border-slate-800/60 rounded-md p-2.5 hover:border-slate-700 transition-all duration-200"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Count Select */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Number of Panels ({selectedPanelCount})</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setValue("panelCount", count, { shouldValidate: true })}
                    className={`h-11 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                      selectedPanelCount === count
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              {errors.panelCount && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.panelCount.message}</p>
              )}
            </div>

          </CardContent>

          <CardFooter className="border-t border-slate-800/40 pt-6 justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-400 text-white font-semibold flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Generating Story Outline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  Begin Generation
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
