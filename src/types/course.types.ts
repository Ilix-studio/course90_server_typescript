export interface CreateCourseBody {
  name: string;
  description?: string;
}

export interface CreateSubjectBody {
  name: string;
  description?: string;
  courseId: string;
  assignedTeacher?: string;
}

// Missing types for Course controllers
export interface UpdateCourseBody {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCoursesBody {
  courseId: string;
  name?: string;
  description?: string;
}

export interface DeleteCourseParams {
  id: string;
}

export interface GetCourseParams {
  id: string;
}

export interface GetCoursesQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface AddSubjectParams {
  courseId: string;
}

export interface UpdateSubjectBody {
  name?: string;
  description?: string;
  assignedTeacher?: string;
  isActive?: boolean;
}

export interface SubjectParams {
  courseId: string;
  subjectId: string;
}

// Response interfaces
export interface CourseResponse {
  success: boolean;
  message: string;
  data: any; // Replace with your Course model type
}

export interface CoursesResponse {
  success: boolean;
  message: string;
  data: any[]; // Replace with your Course model type array
  count?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCourses: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SubjectResponse {
  success: boolean;
  message: string;
  data: any; // Replace with your Subject model type
}
