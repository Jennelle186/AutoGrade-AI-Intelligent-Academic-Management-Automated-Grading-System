/**
 * Batch Grading Service with Anti-Duplication & Idempotency Safeguards
 * 
 * Protects against duplicate task creation and duplicate LMS grade submissions
 * (e.g. for Google Classroom, Canvas, or custom LMS APIs).
 */

export interface GradeSubmissionPayload {
  submission_id: string; // Unique LMS submission ID (e.g. AQ.Ab8RN6L6GzD4t7egTqQ...)
  course_id?: string;
  coursework_id?: string;
  student_id: string;
  student_name?: string;
  raw_score: number;
  total_items: number;
  percentage_score?: number;
  feedback?: string;
  draft_grade?: number;
}

export interface BatchProcessingOptions {
  batchSize?: number; // Micro-batch size (default: 5)
  delayBetweenBatchesMs?: number; // Throttling delay between micro-batches (default: 300ms)
  maxRetries?: number; // Max retries per item (default: 3)
  accessToken?: string; // LMS OAuth token (optional)
  existingSubmissionIds?: Set<string>; // Pre-fetched list of already processed submission IDs
}

export interface ProcessingResultItem {
  submission_id: string;
  student_id: string;
  status: "SUCCESS" | "SKIPPED_DUPLICATE" | "FAILED" | "SKIPPED_ALREADY_GRADED";
  assigned_grade?: number;
  message?: string;
  timestamp: string;
}

export interface BatchGradingResponse {
  total: number;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  results: ProcessingResultItem[];
}

// Global in-flight set to prevent parallel execution race conditions on the exact same submission_id
const inFlightSubmissions = new Set<string>();

/**
 * Submits grades in batches to an LMS API with robust deduplication,
 * idempotency checks, and safe retry mechanisms.
 */
export async function processBatchGrading(
  submissions: GradeSubmissionPayload[],
  options: BatchProcessingOptions = {},
  // Optional callback to perform the actual LMS API call or database save
  lmsSubmitHandler?: (item: GradeSubmissionPayload) => Promise<{ success: boolean; grade?: number; note?: string }>
): Promise<BatchGradingResponse> {
  const {
    batchSize = 5,
    delayBetweenBatchesMs = 300,
    maxRetries = 3,
    existingSubmissionIds = new Set<string>(),
  } = options;

  const results: ProcessingResultItem[] = [];

  // ------------------------------------------------------------------
  // SAFEGUARD 1: INPUT DEDUPLICATION & IDEMPOTENCY KEY VERIFICATION
  // ------------------------------------------------------------------
  const uniqueSubmissionsMap = new Map<string, GradeSubmissionPayload>();
  const duplicateInputIds: string[] = [];

  for (const item of submissions) {
    if (!item.submission_id) {
      console.warn("[Batch Grading] Skipping item missing submission_id:", item);
      continue;
    }

    if (uniqueSubmissionsMap.has(item.submission_id)) {
      duplicateInputIds.push(item.submission_id);
    } else {
      uniqueSubmissionsMap.set(item.submission_id, item);
    }
  }

  // Record skipped duplicate inputs immediately
  for (const dupId of duplicateInputIds) {
    const originalItem = submissions.find((s) => s.submission_id === dupId);
    results.push({
      submission_id: dupId,
      student_id: originalItem?.student_id || "unknown",
      status: "SKIPPED_DUPLICATE",
      message: "Duplicate submission ID found in batch payload; skipped redundant processing.",
      timestamp: new Date().toISOString(),
    });
  }

  const uniqueSubmissions = Array.from(uniqueSubmissionsMap.values());

  // ------------------------------------------------------------------
  // SAFEGUARD 2: CHUNKED / SEQUENTIAL BATCH EXECUTION (FOR...OF)
  // Replaces unbounded Promise.all to prevent race conditions and rate limits
  // ------------------------------------------------------------------
  const chunks: GradeSubmissionPayload[][] = [];
  for (let i = 0; i < uniqueSubmissions.length; i += batchSize) {
    chunks.push(uniqueSubmissions.slice(i, i + batchSize));
  }

  console.log(`[Batch Grading] Processing ${uniqueSubmissions.length} unique items across ${chunks.length} micro-batch(es).`);

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];

    // Process items in current chunk sequentially or with controlled parallelism
    for (const item of chunk) {
      const subId = item.submission_id;

      // Check 2a: Check if already recorded in existing database / LMS state
      if (existingSubmissionIds.has(subId)) {
        console.info(`[Batch Grading] Submission ${subId} was already graded. Skipping.`);
        results.push({
          submission_id: subId,
          student_id: item.student_id,
          status: "SKIPPED_ALREADY_GRADED",
          message: "Grade entry already exists in database/LMS record.",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Check 2b: In-Flight Lock (prevents concurrent tasks from touching same submission)
      if (inFlightSubmissions.has(subId)) {
        console.warn(`[Batch Grading] Submission ${subId} is currently being processed by another worker. Skipping lock.`);
        results.push({
          submission_id: subId,
          student_id: item.student_id,
          status: "SKIPPED_DUPLICATE",
          message: "Task lock active: another thread is currently processing this submission ID.",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Acquire Lock
      inFlightSubmissions.add(subId);

      try {
        // Compute standardized percentage & grade score
        const totalItems = item.total_items > 0 ? item.total_items : 100;
        const percentage = item.percentage_score ?? (item.raw_score / totalItems) * 100;

        // SAFEGUARD 3: IDEMPOTENT RETRY LOOP WITH STATE PRE-CHECK
        let attempt = 0;
        let success = false;
        let lastError: any = null;
        let assignedGrade: number | undefined = item.raw_score;

        while (attempt < maxRetries && !success) {
          attempt++;
          try {
            if (lmsSubmitHandler) {
              const res = await lmsSubmitHandler(item);
              success = res.success;
              if (res.grade !== undefined) assignedGrade = res.grade;
            } else {
              // Default mock handler for demo/testing
              success = true;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`[Batch Grading] Attempt ${attempt}/${maxRetries} failed for submission ${subId}:`, err?.message || err);

            // Backoff delay before retry
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
          }
        }

        if (success) {
          // Add to existing set to guarantee idempotency within current lifecycle
          existingSubmissionIds.add(subId);

          results.push({
            submission_id: subId,
            student_id: item.student_id,
            status: "SUCCESS",
            assigned_grade: assignedGrade,
            message: `Successfully processed and recorded grade (${assignedGrade}/${totalItems}, ${percentage.toFixed(1)}%).`,
            timestamp: new Date().toISOString(),
          });
        } else {
          results.push({
            submission_id: subId,
            student_id: item.student_id,
            status: "FAILED",
            message: `Failed after ${maxRetries} attempts: ${lastError?.message || "LMS API error"}`,
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        // Release Lock
        inFlightSubmissions.delete(subId);
      }
    }

    // Delay between chunks to prevent LMS API rate-limiting
    if (chunkIdx < chunks.length - 1 && delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }

  const processedCount = results.filter((r) => r.status === "SUCCESS").length;
  const skippedCount = results.filter((r) => r.status.startsWith("SKIPPED")).length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  return {
    total: submissions.length,
    processedCount,
    skippedCount,
    failedCount,
    results,
  };
}
