import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  IconAward,
  IconCalendar,
  IconBook,
  IconTrendingUp,
  IconAlertCircle,
  IconSparkles,
  IconClock,
  IconCircleCheck,
} from "@tabler/icons-react";

export default function StudentDashboardPage() {
  const currentCourses = [
    {
      code: "CS301",
      name: "Advanced Algorithms",
      credits: 4,
      instructor: "Dr. Amanda Reyes",
      grade: "A-",
      attendance: 94,
      nextAssessment: "Midterm Exam (in 5 days)",
      status: "good",
    },
    {
      code: "CS302",
      name: "Database Systems",
      credits: 3,
      instructor: "Dr. Amanda Reyes",
      grade: "B+",
      attendance: 91,
      nextAssessment: "Project Milestone 2 (in 8 days)",
      status: "good",
    },
    {
      code: "CS303",
      name: "Operating Systems",
      credits: 4,
      instructor: "Mr. Samuel Okafor",
      grade: "B",
      attendance: 88,
      nextAssessment: "Kernel Lab 3 (in 3 days)",
      status: "warning",
    },
    {
      code: "MATH301",
      name: "Probability and Statistics",
      credits: 3,
      instructor: "Dr. Kevin Miller",
      grade: "A",
      attendance: 97,
      nextAssessment: "Quiz 4 (in 12 days)",
      status: "good",
    },
  ];

  const recentRecommendations = [
    {
      title: "Operating Systems Lab Practice",
      source: "Predictive Analytics Agent",
      message: "Scores on memory paging assignments suggest practicing threading and deadlock labs before the upcoming midterm.",
      severity: "medium",
    },
    {
      title: "High Attendance Streak in MATH301",
      source: "Academic Tracking System",
      message: "Excellent consistency! Your 97% attendance correlates with a 92% historical probability of an 'A' grade.",
      severity: "low",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-background p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <IconCircleCheck className="size-3.5" />
              <span>Academic Standing: Normal / Low Risk</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back to your Academic Portal
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Spring Term 2026 • Bachelor of Science in Computer Science • Semester 6
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur px-4 py-2 rounded-xl border text-xs font-medium text-muted-foreground shadow-sm">
              <IconClock className="size-4 text-primary" />
              <span>30-min Inactive Session Timeout Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cumulative GPA
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconAward className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">3.68</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              <IconTrendingUp className="size-3.5" />
              <span>+0.12 from last semester</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Term Attendance
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconCalendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">92.5%</div>
            <p className="text-xs text-muted-foreground mt-1">37 / 40 sessions attended</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Enrolled Credits
            </CardTitle>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <IconBook className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">14 hrs</div>
            <p className="text-xs text-muted-foreground mt-1">4 core courses in progress</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Predicted Risk
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconSparkles className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Low Risk</div>
            <p className="text-xs text-muted-foreground mt-1">Confidence score: 94.2%</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Enrolled Courses */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Current Courses & Grades</CardTitle>
                <CardDescription>Academic progress for Spring 2026 semester</CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold text-xs">
                4 Active
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCourses.map((course) => (
                <div
                  key={course.code}
                  className="p-4 rounded-xl border bg-card/50 hover:bg-accent/5 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                          {course.code}
                        </span>
                        <h3 className="text-sm font-bold text-foreground">{course.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Instructor: {course.instructor} • {course.credits} Credits
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Grade</span>
                        <span className="text-base font-extrabold text-foreground">{course.grade}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Attendance</span>
                        <span className="text-base font-extrabold text-foreground">{course.attendance}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Term Progress</span>
                      <span>{course.nextAssessment}</span>
                    </div>
                    <Progress value={course.attendance} className="h-1.5" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations & Alerts */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <IconSparkles className="size-4" />
                <span>Predictive Insights</span>
              </div>
              <CardTitle className="text-base">AI Academic Advisor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentRecommendations.map((rec, i) => (
                <div key={i} className="p-3.5 rounded-xl border bg-background/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{rec.title}</span>
                    <Badge variant={rec.severity === "medium" ? "secondary" : "outline"} className="text-[10px]">
                      {rec.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
              <CardDescription>Assessments scheduled for this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 text-xs p-2.5 rounded-lg border bg-accent/5">
                <IconClock className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Kernel Lab 3 (CS303)</p>
                  <p className="text-muted-foreground">Due Friday, 11:59 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs p-2.5 rounded-lg border bg-accent/5">
                <IconAlertCircle className="size-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Midterm Exam (CS301)</p>
                  <p className="text-muted-foreground">Monday, 09:00 AM • Room 302</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
