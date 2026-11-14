// Video generation. Every screen talks to the `VideoGenerator` interface only, so the
// preview generator below can be replaced by a real cloud AI video service later
// (the phone uploads the request to our server, the server calls the AI model).

import { clipForPrompt } from '@/data/clips';
import type { MediaSource, Project } from '@/types';

import { scenePrompt } from './director';

export interface GenerationResult {
  result: MediaSource;
}

export interface VideoGenerator {
  /** Shown in the app, so people know whether the video is real AI or a preview. */
  readonly label: string;
  readonly isPreview: boolean;
  generate(project: Project, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<GenerationResult>;
}

/**
 * Preview generator: works offline and free. It builds the full prompt for every scene
 * (exactly what the real AI will get) and returns a matching built-in clip.
 */
export class PreviewGenerator implements VideoGenerator {
  readonly label = 'Preview mode';
  readonly isPreview = true;

  async generate(project: Project, onProgress: (f: number) => void, signal?: AbortSignal): Promise<GenerationResult> {
    const prompts = project.scenes.map((_, i) =>
      scenePrompt({ scenes: project.scenes, style: project.style, notes: project.notes }, i, !!project.media),
    );
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (signal?.aborted) throw new Error('Cancelled');
      onProgress(i / steps);
    }
    return { result: { clip: clipForPrompt(`${project.prompt} ${prompts.join(' ')}`) } };
  }
}

export const generator: VideoGenerator = new PreviewGenerator();
