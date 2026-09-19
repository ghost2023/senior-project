import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { computeFinalGrade, type ScoredComponent } from "../grading";
import { auth } from "../auth";
import { db } from "./index";
import {
  academicTerms,
  alertThresholds,
  assessmentComponents,
  attendanceRecords,
  courses,
  departments,
  enrollments,
  facultyAdmins,
  finalGrades,
  gradeEntries,
  programs,
  sections,
  students,
  teachers,
  user,
} from "./schema";

faker.seed(42); // deterministic dataset across re-seeds

// ---------------------------------------------------------------------------
// Trajectory archetypes drive both grade and attendance sampling per term,
// and ARE the ground-truth signal the ML service is trained to recover.
// ---------------------------------------------------------------------------

type Archetype = "stable_high" | "stable_mid" | "declining" | "recovering" | "erratic";

const ARCHETYPES: { archetype: Archetype; weight: number }[] = [
  { archetype: "stable_high", weight: 3 },
  { archetype: "stable_mid", weight: 4 },
  { archetype: "declining", weight: 2 },
  { archetype: "recovering", weight: 1.5 },
  { archetype: "erratic", weight: 1.5 },
];

function pickArchetype(): Archetype {
  const total = ARCHETYPES.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of ARCHETYPES) {
    r -= a.weight;
    if (r <= 0) return a.archetype;
  }
  return "stable_mid";
}

/** Returns a base score (0-100) and attendance rate (0-1) for a given
 * archetype at a given term index (0 = earliest term the student has taken). */
function archetypeSignal(archetype: Archetype, termIndex: number, totalTerms: number) {
  const progress = totalTerms <= 1 ? 0 : termIndex / (totalTerms - 1); // 0..1
  let baseScore: number;
  let attendance: number;
  switch (archetype) {
    case "stable_high":
      baseScore = 90;
      attendance = 0.95;
      break;
    case "stable_mid":
      baseScore = 78;
      attendance = 0.88;
      break;
    case "declining":
      baseScore = 88 - progress * 30; // drifts down to ~58
      attendance = 0.92 - progress * 0.35;
      break;
    case "recovering":
      baseScore = 62 + progress * 28; // drifts up to ~90
      attendance = 0.68 + progress * 0.28;
      break;
    case "erratic":
      baseScore = 74 + (faker.number.float({ min: -1, max: 1 }) * 18);
      attendance = 0.78 + faker.number.float({ min: -1, max: 1 }) * 0.15;
      break;
  }
  return { baseScore, attendance: Math.min(0.99, Math.max(0.35, attendance)) };
}

function noisy(value: number, spread: number, min = 0, max = 100) {
  const v = value + faker.number.float({ min: -spread, max: spread });
  return Math.min(max, Math.max(min, v));
}

async function main() {
  console.log("Seeding SATPS synthetic dataset...");

  // -------------------------------------------------------------------
  // 1. Departments + programs
  // -------------------------------------------------------------------
  const deptDefs = [
    { name: "Computer Science", code: "CS" },
    { name: "Electrical Engineering", code: "EE" },
    { name: "Business Administration", code: "BUS" },
    { name: "Mathematics", code: "MATH" },
  ];
  const deptRows = await db.insert(departments).values(deptDefs).returning();

  const programRows = await db
    .insert(programs)
    .values(
      deptRows.flatMap((d) => [
        { departmentId: d.id, name: `BSc ${d.name}`, degreeLevel: "BSc" },
      ]),
    )
    .returning();

  // -------------------------------------------------------------------
  // 2. Academic terms — 6 terms spanning 3 years, most recent is current
  // -------------------------------------------------------------------
  const termDefs = [
    { label: "Fall 2023", academicYear: "2023-2024", termType: "fall", startDate: "2023-09-01", endDate: "2023-12-20" },
    { label: "Spring 2024", academicYear: "2023-2024", termType: "spring", startDate: "2024-02-01", endDate: "2024-05-25" },
    { label: "Fall 2024", academicYear: "2024-2025", termType: "fall", startDate: "2024-09-01", endDate: "2024-12-20" },
    { label: "Spring 2025", academicYear: "2024-2025", termType: "spring", startDate: "2025-02-01", endDate: "2025-05-25" },
    { label: "Fall 2025", academicYear: "2025-2026", termType: "fall", startDate: "2025-09-01", endDate: "2025-12-20" },
    { label: "Spring 2026", academicYear: "2025-2026", termType: "spring", startDate: "2026-02-01", endDate: "2026-05-25", isCurrent: true },
  ];
  const termRows = await db.insert(academicTerms).values(termDefs).returning();
  const currentTerm = termRows[termRows.length - 1];

  // -------------------------------------------------------------------
  // 3. Courses (per department) + sections (per course per term)
  // -------------------------------------------------------------------
  const courseCatalog: Record<string, { code: string; name: string; credits: number }[]> = {
    CS: [
      { code: "CS101", name: "Introduction to Programming", credits: 4 },
      { code: "CS201", name: "Data Structures", credits: 4 },
      { code: "CS301", name: "Advanced Algorithms", credits: 4 },
      { code: "CS302", name: "Database Systems", credits: 3 },
      { code: "CS303", name: "Operating Systems", credits: 4 },
      { code: "CS304", name: "Machine Learning", credits: 3 },
    ],
    EE: [
      { code: "EE101", name: "Circuit Analysis", credits: 4 },
      { code: "EE201", name: "Digital Logic Design", credits: 3 },
      { code: "EE301", name: "Signals and Systems", credits: 4 },
    ],
    BUS: [
      { code: "BUS101", name: "Principles of Management", credits: 3 },
      { code: "BUS201", name: "Financial Accounting", credits: 3 },
      { code: "BUS301", name: "Marketing Strategy", credits: 3 },
    ],
    MATH: [
      { code: "MATH101", name: "Calculus I", credits: 4 },
      { code: "MATH201", name: "Linear Algebra", credits: 3 },
      { code: "MATH301", name: "Probability and Statistics", credits: 3 },
    ],
  };

  const courseRows: (typeof courses.$inferSelect)[] = [];
  for (const dept of deptRows) {
    const defs = courseCatalog[dept.code] ?? [];
    const inserted = await db
      .insert(courses)
      .values(defs.map((c) => ({ ...c, departmentId: dept.id })))
      .returning();
    courseRows.push(...inserted);
  }

  // -------------------------------------------------------------------
  // 4. Teachers (users + role rows), ~2-3 per department
  // -------------------------------------------------------------------
  const demoPassword = "Password123!";
  const teacherRows: (typeof teachers.$inferSelect)[] = [];

  async function createUser(opts: {
    name: string;
    email: string;
    role: "student" | "teacher" | "faculty_admin";
    password?: string;
  }) {
    await auth.api.signUpEmail({
      body: { name: opts.name, email: opts.email, password: opts.password ?? demoPassword },
    });
    await db.update(user).set({ role: opts.role }).where(eq(user.email, opts.email));
    const [row] = await db.select().from(user).where(eq(user.email, opts.email));
    return row;
  }

  // Fixed demo teacher accounts (predictable creds for login)
  const demoTeacherDefs = [
    { name: "Dr. Amanda Reyes", email: "teacher1@satps.edu", deptCode: "CS" },
    { name: "Mr. Samuel Okafor", email: "teacher2@satps.edu", deptCode: "EE" },
  ];
  for (const t of demoTeacherDefs) {
    const u = await createUser({ name: t.name, email: t.email, role: "teacher" });
    const dept = deptRows.find((d) => d.code === t.deptCode)!;
    const [row] = await db
      .insert(teachers)
      .values({ userId: u.id, departmentId: dept.id, title: "Lecturer" })
      .returning();
    teacherRows.push(row);
  }

  // Bulk synthetic teachers
  for (const dept of deptRows) {
    for (let i = 0; i < 2; i++) {
      const name = faker.person.fullName();
      const email = faker.internet.email({ firstName: name.split(" ")[0], provider: "satps.edu" }).toLowerCase();
      const u = await createUser({ name, email, role: "teacher", password: faker.internet.password({ length: 16 }) });
      const [row] = await db
        .insert(teachers)
        .values({ userId: u.id, departmentId: dept.id, title: faker.helpers.arrayElement(["Lecturer", "Senior Lecturer", "Assistant Professor"]) })
        .returning();
      teacherRows.push(row);
    }
  }

  // Sections: 1-2 per course per term, teacher assigned round-robin within dept
  const sectionRows: (typeof sections.$inferSelect)[] = [];
  for (const course of courseRows) {
    const deptTeachers = teacherRows.filter((t) => t.departmentId === course.departmentId);
    for (const term of termRows) {
      const numSections = faker.helpers.arrayElement([1, 1, 2]);
      for (let i = 0; i < numSections; i++) {
        const teacher = deptTeachers[i % deptTeachers.length];
        const [row] = await db
          .insert(sections)
          .values({
            courseId: course.id,
            termId: term.id,
            sectionCode: String.fromCharCode(65 + i), // A, B
            teacherId: teacher?.id,
            capacity: 40,
          })
          .returning();
        sectionRows.push(row);
        await db.insert(assessmentComponents).values([
          { sectionId: row.id, name: "Quiz 1", weightPct: "10", maxScore: "100" },
          { sectionId: row.id, name: "Quiz 2", weightPct: "10", maxScore: "100" },
          { sectionId: row.id, name: "Midterm", weightPct: "30", maxScore: "100" },
          { sectionId: row.id, name: "Final", weightPct: "50", maxScore: "100" },
        ]);
      }
    }
  }

  // -------------------------------------------------------------------
  // 5. Students (demo + bulk), each assigned an archetype
  // -------------------------------------------------------------------
  const demoStudentDefs = [
    { name: "Alex Johnson", email: "student1@satps.edu", programCode: "CS", archetype: "declining" as Archetype },
    { name: "Priya Natarajan", email: "student2@satps.edu", programCode: "CS", archetype: "stable_high" as Archetype },
  ];

  type StudentSeed = { row: typeof students.$inferSelect; archetype: Archetype; enrollYear: number };
  const studentSeeds: StudentSeed[] = [];

  let studentNumberCounter = 100001;

  async function makeStudent(name: string, email: string, programCode: string, archetype: Archetype, password?: string) {
    const program = programRows.find((p) => deptRows.find((d) => d.id === p.departmentId)?.code === programCode)!;
    const u = await createUser({ name, email, role: "student", password });
    const enrollYear = faker.helpers.arrayElement([2023, 2023, 2024, 2024, 2025]);
    const [row] = await db
      .insert(students)
      .values({
        userId: u.id,
        studentNumber: String(studentNumberCounter++),
        programId: program.id,
        enrollmentYear: enrollYear,
        currentSemesterNumber: Math.max(1, (2026 - enrollYear) * 2),
        isTransferStudent: faker.datatype.boolean({ probability: 0.1 }),
      })
      .returning();
    studentSeeds.push({ row, archetype, enrollYear });
  }

  for (const s of demoStudentDefs) {
    await makeStudent(s.name, s.email, s.programCode, s.archetype);
  }

  for (const dept of deptRows) {
    const deptProgram = programRows.find((p) => p.departmentId === dept.id)!;
    for (let i = 0; i < 12; i++) {
      const name = faker.person.fullName();
      const email = faker.internet.email({ firstName: name.split(" ")[0], provider: "satps.edu" }).toLowerCase();
      await makeStudent(name, email, dept.code, pickArchetype(), faker.internet.password({ length: 16 }));
    }
  }

  console.log(`Created ${studentSeeds.length} students, ${teacherRows.length} teachers, ${sectionRows.length} sections.`);

  // -------------------------------------------------------------------
  // 6. Enrollments + grades + attendance, archetype-driven
  // -------------------------------------------------------------------
  for (const { row: student, archetype, enrollYear } of studentSeeds) {
    const dept = deptRows.find((d) => d.id === programRows.find((p) => p.id === student.programId)!.departmentId)!;
    const deptCourses = courseRows.filter((c) => c.departmentId === dept.id);

    // Which terms has this student been active for, based on enrollYear
    const eligibleTerms = termRows.filter((t) => {
      const termYearStart = Number(t.academicYear.slice(0, 4));
      return termYearStart >= enrollYear;
    });

    for (const [termIndex, term] of eligibleTerms.entries()) {
      const { baseScore, attendance } = archetypeSignal(archetype, termIndex, eligibleTerms.length);

      // Enroll in 3-4 courses this term
      const termSections = sectionRows.filter((sec) => sec.termId === term.id && deptCourses.some((c) => c.id === sec.courseId));
      const chosen = faker.helpers.arrayElements(termSections, Math.min(termSections.length, faker.number.int({ min: 3, max: 4 })));

      for (const section of chosen) {
        const [enrollment] = await db
          .insert(enrollments)
          .values({ studentId: student.id, sectionId: section.id, status: term.id === currentTerm.id ? "active" : "completed" })
          .returning();

        const components = await db.select().from(assessmentComponents).where(eq(assessmentComponents.sectionId, section.id));

        const scored: ScoredComponent[] = [];
        for (const comp of components) {
          // Skip some components for the *current* term to simulate "not graded yet"
          const isCurrentTerm = term.id === currentTerm.id;
          const skipProbability = isCurrentTerm && comp.name === "Final" ? 0.85 : isCurrentTerm && comp.name === "Midterm" ? 0.3 : 0;
          if (Math.random() < skipProbability) continue;

          const score = Math.round(noisy(baseScore, 8));
          scored.push({ weightPct: Number(comp.weightPct), maxScore: Number(comp.maxScore), score });
          await db.insert(gradeEntries).values({
            enrollmentId: enrollment.id,
            assessmentComponentId: comp.id,
            score: String(score),
            enteredByTeacherId: section.teacherId!,
          });
        }

        const finalGrade = computeFinalGrade(scored);
        if (finalGrade) {
          await db.insert(finalGrades).values({
            enrollmentId: enrollment.id,
            weightedTotal: String(finalGrade.weightedTotal),
            letterGrade: finalGrade.letterGrade,
            gpaPoints: String(finalGrade.gpaPoints),
          });
        }

        // Attendance: ~15 sessions per section per term
        const sessionCount = term.id === currentTerm.id ? 8 : 15;
        const start = new Date(term.startDate);
        for (let s = 0; s < sessionCount; s++) {
          const sessionDate = new Date(start);
          sessionDate.setDate(sessionDate.getDate() + s * 7);
          const present = Math.random() < attendance;
          await db.insert(attendanceRecords).values({
            enrollmentId: enrollment.id,
            sessionDate: sessionDate.toISOString().slice(0, 10),
            status: present ? "present" : faker.helpers.arrayElement(["absent", "absent", "late"]),
            recordedByTeacherId: section.teacherId!,
          });
        }
      }
    }
  }

  console.log("Grades and attendance seeded.");

  // -------------------------------------------------------------------
  // 7. Faculty admins (demo)
  // -------------------------------------------------------------------
  const adminU = await createUser({ name: "Dr. Bethel Assefa", email: "admin@satps.edu", role: "faculty_admin" });
  const [adminRow] = await db.insert(facultyAdmins).values({ userId: adminU.id }).returning();

  // -------------------------------------------------------------------
  // 8. Default alert thresholds (A-16)
  // -------------------------------------------------------------------
  await db.insert(alertThresholds).values([
    { scope: "global", riskLevel: "warning", minScore: "0.4", updatedByUserId: adminU.id },
    { scope: "global", riskLevel: "at_risk", minScore: "0.6", updatedByUserId: adminU.id },
    { scope: "global", riskLevel: "critical", minScore: "0.8", updatedByUserId: adminU.id },
  ]);

  console.log("Seed complete.");
  console.log("Demo logins (password: Password123!):");
  console.log("  student1@satps.edu / student2@satps.edu");
  console.log("  teacher1@satps.edu / teacher2@satps.edu");
  console.log("  admin@satps.edu");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
