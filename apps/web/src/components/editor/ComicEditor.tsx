"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProject } from "../../lib/hooks/useProject";
import api from "../../lib/api";
import { submitReviewSchema, type SubmitReviewFormValues } from "../../lib/validation/form-schemas";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button, Textarea, Progress, useToast, Skeleton } from "@panelcraft/ui";
import { ArrowLeft, CheckCircle, RefreshCw, AlertCircle, Sparkles, User, HelpCircle, Film, Image as ImageIcon, Send } from "lucide-react";

interface ComicEditorProps {
  projectId: string;
}

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = React.useState(false);

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 text-sm space-y-2 w-full h-full bg-slate-950">
        <ImageIcon className="h-8 w-8 text-slate-700 animate-pulse" />
        <span className="text-xs text-slate-500">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export function ComicEditor({ projectId }: ComicEditorProps) {
  const { toast } = useToast();
  const { project, loading, error, refetch } = useProject(projectId);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SubmitReviewFormValues>({
    resolver: zodResolver(submitReviewSchema),
    defaultValues: {
      approved: true,
      comment: "",
    },
  });

  const onSubmitReview = async (data: SubmitReviewFormValues) => {
    setSubmittingReview(true);
    try {
      await api.submitReview(projectId, {
        approved: data.approved,
        comment: data.comment || undefined,
      });

      toast({
        variant: "success",
        title: data.approved ? "Panel Approved!" : "Regeneration Queued",
        description: data.approved
          ? "Continuing comic generation workflow in the background."
          : "Regenerating the current panel with your feedback comments.",
      });

      reset({ approved: true, comment: "" });
      refetch(); // Trigger immediate update
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Review submission failed",
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Completed", variant: "success" as const };
      case "pending_review":
        return { text: "Review Required", variant: "warning" as const };
      case "failed":
        return { text: "Failed", variant: "destructive" as const };
      case "processing":
        return { text: "Generating Panels...", variant: "default" as const };
      case "created":
        return { text: "Creating Outline...", variant: "default" as const };
      default:
        return { text: status, variant: "secondary" as const };
    }
  };

  const getPanelStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Completed", className: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" };
      case "generated":
        return { text: "Review Pending", className: "bg-amber-950/40 text-amber-400 border-amber-500/30" };
      case "generating":
        return { text: "Generating...", className: "bg-indigo-950/40 text-indigo-400 border-indigo-500/30 animate-pulse" };
      case "pending":
        return { text: "Pending", className: "bg-slate-900 text-slate-500 border-slate-800" };
      case "failed":
        return { text: "Failed", className: "bg-red-950/40 text-red-400 border-red-500/30" };
      default:
        return { text: status, className: "bg-slate-800 text-slate-300" };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Skeleton className="h-96 lg:col-span-1 rounded-xl" />
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Failed to Load Project</h2>
        <p className="text-slate-400 max-w-sm text-sm">
          {error?.message || "This project could not be loaded."}
        </p>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Find the active panel waiting for review (status = "generated")
  const activeReviewPanel = project.panels.find((p) => p.status === "generated");
  const completedPanelCount = project.panels.filter((p) => p.status === "completed").length;
  const progressPercent = project.panelCount > 0 ? (completedPanelCount / project.panelCount) * 100 : 0;
  const projectStatus = getStatusLabel(project.status);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors duration-200 group mb-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white line-clamp-1">
              {project.prompt}
            </h1>
            <Badge variant={projectStatus.variant}>
              {projectStatus.text}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">Project ID: {project.id}</p>
        </div>

        {/* Polling/Sync Loader */}
        {(project.status === "created" || project.status === "processing") && (
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 px-3 py-1.5 rounded-full shadow-sm animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>AI generating story & images...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Character Bible & Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Progress Tracker Card */}
          <Card className="border-slate-800/80 bg-slate-900/40">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Workflow Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Completed: {completedPanelCount} / {project.panelCount} Panels</span>
                <span className="font-semibold text-indigo-400">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* Character Bible Card */}
          <Card className="border-slate-800/80 bg-slate-900/40">
            <CardHeader className="p-4 border-b border-slate-800/40">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-indigo-400" />
                Character Bible
              </CardTitle>
              <CardDescription className="text-xs">
                Generated automatically to ensure scene consistency.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 divide-y divide-slate-800/40">
              {!project.characterBible || project.characterBible.characters.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 italic">
                  Not generated yet. Available once outline completes.
                </div>
              ) : (
                project.characterBible.characters.map((char, idx) => (
                  <div key={char.name} className={`pt-4 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{char.name}</h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {char.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1"><span className="text-slate-500 font-semibold">Visual:</span> {char.visual}</p>
                    {char.traits && (
                      <p className="text-xs text-slate-400"><span className="text-slate-500 font-semibold">Traits:</span> {char.traits}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* HITL Review Container */}
          {activeReviewPanel && (
            <Card className="border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-500/5 overflow-hidden">
              <div className="h-1 w-full bg-amber-500" />
              <CardHeader className="p-5">
                <div className="flex items-center space-x-2 text-amber-400 mb-1">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Human-in-the-Loop Interrupt</span>
                </div>
                <CardTitle className="text-lg font-bold text-white">
                  Review Required: Panel {activeReviewPanel.index + 1}
                </CardTitle>
                <CardDescription className="text-slate-300 mt-1">
                  AI generated the panel description and layout. Please approve the panel below, or reject it with feedback to trigger a recreation.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Image Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Output</span>
                  <div className="aspect-video relative rounded-lg border border-slate-800 bg-black flex items-center justify-center overflow-hidden">
                    {activeReviewPanel.imageUrl ? (
                      <ImageWithFallback
                        src={activeReviewPanel.imageUrl}
                        alt={`Panel ${activeReviewPanel.index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
                        <ImageIcon className="h-8 w-8 text-slate-600 animate-pulse" />
                        <span>Rendering image...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Controls */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Panel Prompt</span>
                    <p className="text-sm text-slate-200 bg-slate-950/60 border border-slate-800 rounded-lg p-3 italic">
                      "{activeReviewPanel.prompt}"
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feedback Comment</span>
                      <Textarea
                        placeholder="Provide details if requesting regeneration (e.g. 'Change the detective's coat to red and add rain effects'). Leave empty if approving."
                        className="h-20 text-xs resize-none"
                        {...register("comment")}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        type="submit"
                        disabled={submittingReview}
                        onClick={() => setValue("approved", true)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve Panel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingReview}
                        onClick={() => setValue("approved", false)}
                        variant="secondary"
                        className="flex-1 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate Panel
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Panels Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Comic Panels</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.panels.map((panel) => {
                const label = getPanelStatusLabel(panel.status);

                return (
                  <Card key={panel.id} className="border-slate-850/80 bg-slate-900/20 overflow-hidden flex flex-col justify-between">
                    <CardHeader className="p-4 border-b border-slate-800/30 flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-bold text-white">
                        Panel {panel.index + 1}
                      </CardTitle>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold border-transparent ${label.className}`}>
                        {label.text}
                      </span>
                    </CardHeader>

                    <CardContent className="p-4 flex-1 flex flex-col space-y-4">
                      {/* Image Viewer */}
                      <div className="aspect-video relative rounded bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-900">
                        {panel.imageUrl ? (
                          <ImageWithFallback
                            src={panel.imageUrl}
                            alt={`Panel ${panel.index + 1}`}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600 text-xs space-y-1">
                            <ImageIcon className="h-6 w-6" />
                            <span>No image rendered</span>
                          </div>
                        )}
                      </div>

                      {/* Prompt */}
                      {panel.prompt ? (
                        <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-3">
                          "{panel.prompt}"
                        </p>
                      ) : (
                        <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
