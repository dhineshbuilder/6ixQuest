import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Quiz, Question, Response } from '../types/database';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Download, Users, Trophy, BarChart3, ArrowLeft } from 'lucide-react';

const QuizResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .eq('created_by', user?.id)
        .single();

      if (quizError) throw quizError;

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('quiz_id', id)
        .order('submitted_at', { ascending: false });

      if (responsesError) throw responsesError;

      setQuiz(quizData);
      setQuestions(questionsData);
      setResponses(responsesData || []);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (responses.length === 0) {
      return { averageScore: 0, totalResponses: 0, averagePercentage: 0 };
    }

    const totalScore = responses.reduce((sum, response) => sum + response.score, 0);
    const averageScore = totalScore / responses.length;
    const averagePercentage = questions.length > 0 ? (averageScore / questions.length) * 100 : 0;

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      totalResponses: responses.length,
      averagePercentage: Math.round(averagePercentage)
    };
  };

  const exportToCSV = () => {
    if (responses.length === 0) {
      alert('No responses to export');
      return;
    }

    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'Register Number',
      'Score',
      'Total Questions',
      'Percentage',
      'Submitted At',
      ...questions.map((_, index) => `Question ${index + 1}`)
    ];

    const rows = responses.map(response => {
      const percentage = Math.round((response.score / response.total_questions) * 100);
      return [
        response.student_name,
        response.student_email,
        response.student_phone,
        response.student_register_number,
        response.score,
        response.total_questions,
        `${percentage}%`,
        new Date(response.submitted_at).toLocaleString(),
        ...response.answers
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${quiz?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Quiz not found</h1>
            <p className="text-gray-600 mt-2">The quiz you're looking for doesn't exist or you don't have permission to view its results.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600 mt-1">Quiz Results & Analytics</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Created on {new Date(quiz.created_at).toLocaleDateString()}
            </div>
            {responses.length > 0 && (
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalResponses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Trophy className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.averageScore}/{questions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Percentage</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averagePercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Responses Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Student Responses</h2>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
              <p className="text-gray-600 mb-6">Share your quiz with students to start collecting responses!</p>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/quiz/${quiz.id}`;
                  navigator.clipboard.writeText(link);
                  alert('Quiz link copied to clipboard!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Copy Quiz Link
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((response) => {
                    const percentage = Math.round((response.score / response.total_questions) * 100);
                    return (
                      <tr key={response.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words">{response.student_name}</div>
                            <div className="text-sm text-gray-500 break-words">{response.student_email}</div>
                            <div className="text-xs text-gray-400 break-words">Phone: {response.student_phone}</div>
                            <div className="text-xs text-gray-400 break-words">Reg: {response.student_register_number}</div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {response.score}/{response.total_questions}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${percentage >= 80
                            ? 'bg-green-100 text-green-800'
                            : percentage >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500">
                          <div className="break-words">{new Date(response.submitted_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(response.submitted_at).toLocaleTimeString('en-US', { hour12: true })}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              const details = questions.map((question, index) =>
                                `${index + 1}. ${question.question_text}\nStudent Answer: ${response.answers[index]}\nCorrect Answer: ${question.correct_answer}\n${response.answers[index] === question.correct_answer ? '✓ Correct' : '✗ Incorrect'}`
                              ).join('\n\n');

                              alert(`Detailed Response for ${response.student_name}\n\n${details}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;