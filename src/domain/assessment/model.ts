export type ReviewStatus = 'correct' | 'review' | 'error' | 'pending' | 'missing';

export type Teacher = {
  id: string;
  name: string;
  school: string;
};

export type Student = {
  id: string;
  name: string;
  code: string;
  variant: number;
};

export type AssessmentTask = {
  id: string;
  number: number;
  prompt: string;
  expected: string;
  recognized: string;
  status: ReviewStatus;
  confidence?: number;
};

export type Assessment = {
  id: string;
  title: string;
  topic: string;
  className: string;
  studentCount: number;
  checkedCount: number;
  reviewCount: number;
  taskCount: number;
  variantCount: number;
};

export type SheetResult = {
  student: Student;
  tasks: AssessmentTask[];
  score: number;
  maxScore: number;
};
