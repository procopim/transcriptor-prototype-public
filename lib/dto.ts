import { z } from 'zod';
import { Job, Transcript } from './types';

// Base class for common DTO functionality
abstract class BaseDTO {
  // Validation method that operates on generic type and returns the same generic i.e. Job or Transcript
  static validateWithSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    return schema.parse(data);
  }

  // Abstract method for serialization
  abstract toJSON(): Record<string, any>;
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
    created_at: z.union([z.date(), z.string().transform((str) => new Date(str))]),
    updated_at: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  });

  constructor(data: Omit<Job, 'created_at' | 'updated_at'> & { created_at?: Date; updated_at?: Date }) {
    super(); //allows us to use the validateWithSchema method at 'this' level
    const validated = JobDTO.validate({
      ...data,
      created_at: data.created_at || new Date(), //Omitted if not provided by dependents, while optional
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

  // Validate full Job object and return validated data
  static validate(data: any): Job {
    const validated = this.validateWithSchema(this.jobSchema, data);
    return validated;
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
    const validated = this.validateWithSchema(this.jobSchema, data);
    return new JobDTO(validated);
  }

  // Factory method for DB rows
  static fromDatabaseRow(row: any): JobDTO {
    return new JobDTO({
      ...row,
      result: row.result ?? undefined,
      error: row.error ?? undefined,
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
    created_at: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
    updated_at: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  });

  constructor(data: Omit<Transcript, 'id' | 'created_at' | 'updated_at'> & { id?: number; created_at?: Date; updated_at?: Date }) {
    super(); //allows us to use the validateWithSchema method at 'this' level
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

  // Validate full Transcript object and return validated data
  static validate(data: any): Transcript {
    const validated = this.validateWithSchema(this.transcriptSchema, data);
    return validated;
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
    const validated = this.validateWithSchema(this.transcriptSchema, data);
    return new TranscriptDTO(validated);
  }

  // Factory method for DB rows
  static fromDatabaseRow(row: any): TranscriptDTO {
    return new TranscriptDTO({
      ...row,
      language: row.language ?? undefined,
      is_generated: row.is_generated ?? undefined,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined,
    });
  }
}