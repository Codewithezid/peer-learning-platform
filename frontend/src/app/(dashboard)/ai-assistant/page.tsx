'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Brain, Sparkles, MessagesSquare } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface SearchResultItem {
  id: string;
  title: string;
  category: string | null;
  content: string;
}

interface RagContextItem {
  id: string;
  title?: string | null;
  snippet: string;
  score?: number;
}

export default function AIAssistantPage() {
  const [summaryInput, setSummaryInput] = useState('');
  const [summaryResult, setSummaryResult] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchExplanation, setSearchExplanation] = useState('');

  const [quizTitle, setQuizTitle] = useState('');
  const [quizSourceText, setQuizSourceText] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragAnswer, setRagAnswer] = useState('');
  const [ragContexts, setRagContexts] = useState<RagContextItem[]>([]);

  const getSummary = async () => {
    if (!summaryInput.trim()) {
      toast.error('Enter content first');
      return;
    }
    try {
      setSummaryLoading(true);
      const response = await api.post('/ai/summary', { content: summaryInput.trim() });
      const payload = unwrapData<{ summary?: string }>(response);
      setSummaryResult(payload?.summary || 'No summary returned');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to summarize');
    } finally {
      setSummaryLoading(false);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a search query');
      return;
    }
    try {
      setSearchLoading(true);
      const response = await api.post('/ai/search', { query: searchQuery.trim() });
      const payload = unwrapData<{ results?: SearchResultItem[]; explanation?: string }>(response);
      setSearchResults(payload?.results || []);
      setSearchExplanation(payload?.explanation || '');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!quizTitle.trim() || !quizSourceText.trim()) {
      toast.error('Quiz title and content are required');
      return;
    }
    try {
      setQuizLoading(true);
      const response = await api.post('/ai/quiz', {
        title: quizTitle.trim(),
        content: quizSourceText.trim(),
        source_type: 'article',
      });
      setGeneratedQuiz(unwrapData<any>(response));
      toast.success('Quiz generated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Quiz generation failed');
    } finally {
      setQuizLoading(false);
    }
  };

  const askKnowledge = async () => {
    if (!ragQuery.trim()) {
      toast.error('Enter your question first');
      return;
    }

    try {
      setRagLoading(true);
      const response = await api.post('/ai/rag/ask', { question: ragQuery.trim() });
      const payload = unwrapData<{ answer?: string; contexts?: RagContextItem[] }>(response);
      setRagAnswer(payload?.answer || 'No answer returned');
      setRagContexts(payload?.contexts || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to get knowledge answer');
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Summarize content, run intelligent repository search, and generate quizzes.
        </p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">AI Summary</h2>
          <textarea
            rows={8}
            value={summaryInput}
            onChange={(e) => setSummaryInput(e.target.value)}
            placeholder="Paste notes, article text, or documentation..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={getSummary} loading={summaryLoading}>
            Summarize
          </Button>
          {summaryResult && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {summaryResult}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">AI Search</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. onboarding architecture"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={runSearch} loading={searchLoading}>
              Search
            </Button>
          </div>
          {searchExplanation && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-slate-700">
              {searchExplanation}
            </div>
          )}
          <div className="space-y-2">
            {searchResults.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.category && <Badge>{item.category}</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.content?.slice(0, 180)}...</p>
              </div>
            ))}
            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <EmptyState
                icon={<Sparkles className="h-7 w-7" />}
                title="No ranked results"
                description="Try a broader query or add more repository content."
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">AI Quiz Generator</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Quiz title"
            placeholder="React onboarding quiz"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
          />
        </div>
        <textarea
          rows={6}
          value={quizSourceText}
          onChange={(e) => setQuizSourceText(e.target.value)}
          placeholder="Paste source material for quiz generation..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={generateQuiz} loading={quizLoading}>
          Generate Quiz
        </Button>
        {generatedQuiz && (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">{generatedQuiz.title}</p>
            <p className="text-xs text-slate-500 mt-1">
              Questions: {(generatedQuiz.questions || []).length}
            </p>
            <div className="mt-3 space-y-2">
              {(generatedQuiz.questions || []).slice(0, 3).map((q: any, idx: number) => (
                <div key={idx} className="text-sm text-slate-700">
                  {idx + 1}. {q.question}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900">Ask Knowledge Base (RAG)</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask from resources... e.g. How to start peer session?"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
          />
          <Button onClick={askKnowledge} loading={ragLoading}>
            Ask
          </Button>
        </div>

        {ragAnswer && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
            {ragAnswer}
          </div>
        )}

        {ragContexts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Retrieved Contexts</p>
            {ragContexts.map((context) => (
              <div key={context.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{context.title || context.id}</p>
                  {typeof context.score === 'number' && (
                    <Badge variant="primary">Score {context.score.toFixed(2)}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">{context.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
