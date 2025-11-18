import { z } from 'zod';
import { Job, Transcript } from './types';

// Base class for common DTO functionality
abstract class BaseDTO {
  // Validation method that operates on generic type and returns the same generic i.e. Job or Transcript
  static validateWithSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    return schema.parse(data);
  }
}

export class JobDTO extends BaseDTO implements Job {
  id: string;
  question: string;
  source_url: string;
  status: 'submitted' | 'queued' | 'processing' | 'fetched' | 'done' | 'error';
  progress: number;
  result?: string;
  error?: string;
  created_at: Date;
  updated_at: Date;

  // Zod schemas
  static jobUpdateSchema = z.object({
    status: z.enum(['submitted', 'queued', 'processing', 'fetched', 'done', 'error']).optional(),
    progress: z.number().min(0).max(100).optional(),
    result: z.string().optional(),
    error: z.string().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
  );

  static jobSchema = z.object({
    id: z.string(),
    question: z.string(),
    source_url: z.string(),
    status: z.enum(['submitted', 'queued', 'processing', 'fetched', 'done', 'error']),
    progress: z.number().min(0).max(100),
    result: z.string().optional(),
    error: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date(),
  });

  constructor(data: Job) {
    super(); //allows us to use the validateWithSchema method at 'this' level
    this.id = data.id;
    this.question = data.question;
    this.source_url = data.source_url;
    this.status = data.status;
    this.progress = data.progress;
    this.result = data.result;
    this.error = data.error;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validate full Job object
  static validate(data: any): JobDTO {
    const validated = this.validateWithSchema(this.jobSchema, data);
    return new JobDTO(validated);
  }

  // Validate partial updates
  static validateUpdate(updates: Partial<Job>): Partial<Job> {
    return this.jobUpdateSchema.parse(updates);
  }

  // Serialize to JSON (e.g., for API responses)
  toJSON() {
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

  // Deserialize from JSON (e.g., for API requests)
  static fromJSON(data: any): JobDTO {
    const parsed = {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
    return this.validate(parsed);
  }

  // Factory method for DB rows
  static fromDatabaseRow(row: any): JobDTO {
    return new JobDTO({
      id: row.id,
      question: row.question,
      source_url: row.source_url,
      status: row.status,
      progress: row.progress,
      result: row.result,
      error: row.error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}

export class TranscriptDTO extends BaseDTO implements Transcript {
  id?: number;
  video_id: string;
  url: string;
  transcript_text: string;
  language?: string;
  is_generated?: boolean;
  created_at?: Date;
  updated_at?: Date;

  // Zod schema
  static transcriptSchema = z.object({
    id: z.number().optional(),
    video_id: z.string(),
    url: z.string(),
    transcript_text: z.string(),
    language: z.string().optional(),
    is_generated: z.boolean().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
  });

  constructor(data: Transcript) {
    super(); //allows us to use the validateWithSchema method at 'this' level
    this.id = data.id;
    this.video_id = data.video_id;
    this.url = data.url;
    this.transcript_text = data.transcript_text;
    this.language = data.language;
    this.is_generated = data.is_generated;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validate full Transcript object
  static validate(data: any): TranscriptDTO {
    const validated = this.validateWithSchema(this.transcriptSchema, data);
    return new TranscriptDTO(validated);
  }

  // Serialize to JSON
  toJSON() {
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

  // Deserialize from JSON
  static fromJSON(data: any): TranscriptDTO {
    const parsed = {
      ...data,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
    };
    return this.validate(parsed);
  }

  // Factory method for DB rows
  static fromDatabaseRow(row: any): TranscriptDTO {
    return new TranscriptDTO({
      id: row.id,
      video_id: row.video_id,
      url: row.url,
      transcript_text: row.transcript_text,
      language: row.language,
      is_generated: row.is_generated,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}