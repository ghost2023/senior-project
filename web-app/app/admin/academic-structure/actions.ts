import { backendMutation } from "@/lib/backend-client";

async function create(path: string, input: unknown) {
  await backendMutation(path, input);
}

export async function createDepartmentAction(input: { name: string; code: string }) { return create("/structure/department", input); }
export async function createProgramAction(input: { departmentId: string; name: string; degreeLevel?: string }) { return create("/structure/program", input); }
export async function createCourseAction(input: { departmentId: string; code: string; name: string; credits: number }) { return create("/structure/course", input); }
export async function createTermAction(input: { label: string; academicYear: string; termType: "fall" | "spring" | "summer"; startDate: string; endDate: string; isCurrent: boolean }) { return create("/structure/term", input); }
export async function createSectionAction(input: { courseId: string; termId: string; sectionCode: string; capacity: number }) { return create("/structure/section", input); }
export async function assignTeacherToSectionAction(input: { sectionId: string; teacherId: string | null }) { return create("/structure/assign-teacher", input); }
