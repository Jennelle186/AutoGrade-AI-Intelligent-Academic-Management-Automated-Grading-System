import { Assignment, Student, Rubric, Submission } from '../types';

export const INITIAL_CLASS_NAME = "";
export const INITIAL_TEACHER_NAME = "Faculty Professor";

export const INITIAL_ASSIGNMENTS: Assignment[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_GRADES: Record<string, Record<string, number | null>> = {};
export const INITIAL_RUBRICS: Rubric[] = [];
export const SAMPLE_SUBMISSIONS: Submission[] = [];
