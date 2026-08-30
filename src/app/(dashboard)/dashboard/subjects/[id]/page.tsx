import Link from "next/link";
import { ArrowLeft, MessageSquare, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModuleUploader } from "@/components/module-uploader";
import { GenerateReviewButton } from "@/components/generate-review-button";
import { DeleteModuleButton } from "@/components/delete-module-button";
import { CreateQuizDialog } from "@/components/create-quiz-dialog";

export default async function SubjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Fetch Subject
  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (!subject) notFound();

  // 2. Fetch Modules
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("subject_id", id)
    .order("created_at", { ascending: false });

  // 3. Fetch Quizzes created for this subject
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      difficulty,
      total_questions,
      quiz_attempts (
        id,
        score_percentage,
        created_at
      )
    `)
    .eq('subject_id', id)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <Link
        href="/dashboard"
        className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>

      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{subject.title}</h1>
          <p className="text-slate-500 mt-1">{subject.description || "Manage study modules and practice exams."}</p>
        </div>
        
        {/* Action Buttons: Ask AI Tutor + Generate Quiz */}
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/subjects/${id}/chat`}>
            <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50">
              <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
              Ask AI Tutor
            </Button>
          </Link>
          <CreateQuizDialog subjectId={id} modules={modules || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Modules & Quizzes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Modules Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Modules</h2>
            {!modules || modules.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No modules uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                      <span className="text-sm font-medium text-slate-900 truncate">{mod.file_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GenerateReviewButton
                        moduleId={mod.id}
                        subjectId={id}
                        filePath={mod.file_path}
                        hasReview={!!mod.ai_review}
                      />
                      <DeleteModuleButton
                        moduleId={mod.id}
                        subjectId={id}
                        filePath={mod.file_path}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Practice Quizzes Section */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-xl font-semibold text-slate-900">Practice Quizzes</h2>
            {!quizzes || quizzes.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No quizzes generated yet. Use the "Generate Quiz" button above.</p>
            ) : (
              <div className="space-y-3">
                {quizzes?.map((quiz: any) => {
                  // Sort attempts descending so the latest attempt is index 0
                  const attempts = quiz.quiz_attempts || []
                  const sortedAttempts = [...attempts].sort(
                    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  const lastAttempt = sortedAttempts[0]

                  return (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl"
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{quiz.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {quiz.total_questions} Questions • <span className="capitalize">{quiz.difficulty}</span>
                          {lastAttempt && (
                            <span className="ml-1 text-emerald-600 font-medium">
                              • Last Score: {lastAttempt.score_percentage}%
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {lastAttempt && (
                          <Link href={`/dashboard/subjects/${id}/quiz/${quiz.id}/results/${lastAttempt.id}`}>
                            <Button variant="outline" size="sm" className="text-slate-700 hover:text-blue-600 text-xs">
                              Review
                            </Button>
                          </Link>
                        )}
                        <Link href={`/dashboard/subjects/${id}/quiz/${quiz.id}`}>
                          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                            {lastAttempt ? 'Retake Quiz' : 'Take Quiz'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Uploader */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Upload Material</h2>
          <ModuleUploader subjectId={id} />
        </div>
      </div>
    </div>
  );
}