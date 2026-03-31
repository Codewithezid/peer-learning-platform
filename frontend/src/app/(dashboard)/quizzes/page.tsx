'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}

interface QuizAttempt {
  id: string;
  score: number;
  completed_at: string;
  quizzes?: {
    title: string;
  };
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<{ score: number; passed: boolean } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizRes, attemptsRes] = await Promise.all([api.get('/quizzes?limit=30'), api.get('/quizzes/me/attempts')]);
      setQuizzes(unwrapData<Quiz[]>(quizRes) || []);
      setAttempts(unwrapData<QuizAttempt[]>(attemptsRes) || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAnswers(new Array(quiz.questions?.length || 0).fill(-1));
    setLastResult(null);
  };

  const submitAttempt = async () => {
    if (!selectedQuiz) return;
    if (answers.some((a) => a < 0)) {
      toast.error('Please answer all questions');
      return;
    }
    try {
      setSubmitting(true);
      const response = await api.post(`/quizzes/${selectedQuiz.id}/attempt`, { answers });
      const data = unwrapData<{ score: number; passed: boolean }>(response);
      setLastResult({ score: data.score, passed: data.passed });
      await loadData();
      toast.success('Quiz submitted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit attempt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Quizzes and Assessments</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Take AI-generated quizzes and track your scores over time.</p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Quizzes</h2>
          {quizzes.length === 0 ? (
            <EmptyState title="No quizzes available" description="Generate a quiz from AI Assistant." />
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => openQuiz(quiz)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedQuiz?.id === quiz.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">{quiz.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{quiz.questions?.length || 0} questions</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 xl:col-span-2">
          {!selectedQuiz ? (
            <EmptyState
              icon={<HelpCircle className="h-8 w-8" />}
              title="Select a quiz"
              description="Pick any quiz from the left panel to start."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{selectedQuiz.title}</h2>
                <Badge variant="primary">{selectedQuiz.questions?.length || 0} questions</Badge>
              </div>

              {(selectedQuiz.questions || []).map((question, qIdx) => (
                <div key={qIdx} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">
                    {qIdx + 1}. {question.question}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(question.options || []).map((option, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          checked={answers[qIdx] === oIdx}
                          onChange={() =>
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[qIdx] = oIdx;
                              return next;
                            })
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <Button onClick={submitAttempt} loading={submitting}>
                Submit Attempt
              </Button>

              {lastResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Score: {lastResult.score}% ({lastResult.passed ? 'Passed' : 'Not passed'})
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Attempts</h2>
        {attempts.length === 0 ? (
          <EmptyState title="No attempts yet" description="Your quiz history will appear here." />
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, 10).map((attempt) => (
              <div key={attempt.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{attempt.quizzes?.title || 'Quiz attempt'}</p>
                  <Badge variant={attempt.score >= 70 ? 'success' : 'warning'}>{attempt.score}%</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
