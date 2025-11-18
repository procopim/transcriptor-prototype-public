import { z } from 'zod';
import { Job, Transcript } from './types';

export class JobDTO implements Job {
  static schema = z.object({
    id: z.string().min(1),
    question: z.string().min(1),
    source_url: z.string().url(),
    status: z.enum(['submitted', 'queued', 'processing', 'fetched', 'done', 'error']),
    progress: z.number().min(0).max(100),
    result: z.string().optional(),
    error: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date(),
  });

  static validate(data: any): Job {
    return this.schema.parse(data);
  }

  id: string;
  question: string;
  source_url: string;
  status: 'submitted' | 'queued' | 'processing' | 'fetched' | 'done' | 'error';
  progress: number;
  result?: string;
  error?: string;
  created_at: Date;
  updated_at: Date;

  constructor(data: Omit<Job, 'created_at' | 'updated_at'> & { created_at?: Date; updated_at?: Date }) {
    const validated = JobDTO.validate({
      ...data,
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date(),
    });
    this.id = validated.id;
    this.question = validated.question;
    this.source_url = validated.source_url;
    this.status = validated.status;
    this.progress = validated.progress;
    this.result = validated.result;
    this.error = validated.error;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      question: this.question,
      source_url: this.source_url,
      status: this.status,
      progress: this.progress,
      result: this.result,
      error: this.error,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
    };
  }

  static fromJSON(data: any): JobDTO {
    const parsed = z.object({
      id: z.string(),
      question: z.string(),
      source_url: z.string(),
      status: z.enum(['submitted', 'queued', 'processing', 'fetched', 'done', 'error']),
      progress: z.number(),
      result: z.string().optional(),
      error: z.string().optional(),
      created_at: z.string().transform((str) => new Date(str)),
      updated_at: z.string().transform((str) => new Date(str)),
    }).parse(data);
    return new JobDTO(parsed);
  }
}

export class TranscriptDTO implements Transcript {
  static schema = z.object({
    id: z.number().optional(),
    video_id: z.string().min(1),
    url: z.string().url(),
    transcript_text: z.string().min(1),
    language: z.string().optional(),
    is_generated: z.boolean().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
  });

  static validate(data: any): Transcript {
    return this.schema.parse(data);
  }

  id?: number;
  video_id: string;
  url: string;
  transcript_text: string;
  language?: string;
  is_generated?: boolean;
  created_at?: Date;
  updated_at?: Date;

  constructor(data: Omit<Transcript, 'id' | 'created_at' | 'updated_at'> & { id?: number; created_at?: Date; updated_at?: Date }) {
    const validated = TranscriptDTO.validate(data);
    this.id = validated.id;
    this.video_id = validated.video_id;
    this.url = validated.url;
    this.transcript_text = validated.transcript_text;
    this.language = validated.language;
    this.is_generated = validated.is_generated;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      video_id: this.video_id,
      url: this.url,
      transcript_text: this.transcript_text,
      language: this.language,
      is_generated: this.is_generated,
      created_at: this.created_at?.toISOString(),
      updated_at: this.updated_at?.toISOString(),
    };
  }

  static fromJSON(data: any): TranscriptDTO {
    const parsed = z.object({
      id: z.number().optional(),
      video_id: z.string(),
      url: z.string(),
      transcript_text: z.string(),
      language: z.string().optional(),
      is_generated: z.boolean().optional(),
      created_at: z.string().transform((str) => new Date(str)).optional(),
      updated_at: z.string().transform((str) => new Date(str)).optional(),
    }).parse(data);
    return new TranscriptDTO(parsed);
  }
}