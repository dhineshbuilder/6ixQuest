import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Quiz } from '../types/database';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Eye, Edit, Trash2, Users, Clock, BarChart3 } from 'lucide-react';
import { Share2 } from 'lucide-react';
import ShareQuizModal from '../components/ShareQuizModal';

const Dashboard: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseCounts, setResponseCounts] = useState<{ [key: string]: number }>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      if (quizzesData) {
        setQuizzes(quizzesData);

        // Fetch response counts for each quiz
        const counts: { [key: string]: number } = {};
        await Promise.all(
          quizzesData.map(async (quiz) => {
            const { count, error } = await supabase
              .from('responses')
              .select('*', { count: 'exact', head: true })
              .eq('quiz_id', quiz.id);

            if (!error) {
              counts[quiz.id] = count || 0;
            }
          })
        );
        setResponseCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('quizzes')
          .delete()
          .eq('id', quizId);

        if (error) throw error;

        setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      } catch (error) {
        console.error('Error deleting quiz:', error);
      }
    }
  };

  const toggleQuizStatus = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !quiz.is_active })
        .eq('id', quiz.id);

      if (error) throw error;

      setQuizzes(quizzes.map(q => 
        q.id === quiz.id ? { ...q, is_active: !q.is_active } : q
      ));
    } catch (error) {
      console.error('Error updating quiz status:', error);
    }
  };

  const copyQuizLink = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      setSelectedQuiz(quiz);
      setShareModalOpen(true);
    }
  };

  const handleQuizUpdate = (updatedQuiz: Quiz) => {
    setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    setShareModalOpen(false);
  };

  const calculateStats = () => {
    return {};
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your quizzes and view results</p>
          </div>
          <Link
            to="/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="h-5 w-5" />
            Create New Quiz
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(responseCounts).reduce((sum, count) => sum + count, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizzes.filter(q => q.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Quizzes</h2>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first quiz!</p>
              <Link
                to="/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm sm:text-base"
              >
                <Plus className="h-5 w-5" />
                Create Your First Quiz
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                {quizzes.map((quiz) => {
                  const stats = calculateStats();
                  return (
                    <div key={quiz.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{quiz.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleQuizStatus(quiz)}
                          className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            quiz.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {quiz.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>{responseCounts[quiz.id] || 0} responses</span>
                        <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => copyQuizLink(quiz.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Share quiz"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/edit/${quiz.id}`}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Edit quiz"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/results/${quiz.id}`}
                            className="text-emerald-600 hover:text-emerald-900 transition-colors"
                            title="View results"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteQuiz(quiz.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete quiz"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quiz
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responses
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quizzes.map((quiz) => (
                      <tr key={quiz.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words">{quiz.title}</div>
                            {quiz.description && (
                              <div className="text-sm text-gray-500 break-words max-w-xs lg:max-w-sm">
                                {quiz.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleQuizStatus(quiz)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                              quiz.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {quiz.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {responseCounts[quiz.id] || 0}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2 lg:space-x-3">
                            <button
                              onClick={() => copyQuizLink(quiz.id)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Share quiz"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                            <Link
                              to={`/edit/${quiz.id}`}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              title="Edit quiz"
                            >
                              <Edit className="h-5 w-5" />
                            </Link>
                            <Link
                              to={`/results/${quiz.id}`}
                              className="text-emerald-600 hover:text-emerald-900 transition-colors"
                              title="View results"
                            >
                              <BarChart3 className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => deleteQuiz(quiz.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete quiz"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Share Modal */}
        {selectedQuiz && (
          <ShareQuizModal
            quiz={selectedQuiz}
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            onUpdate={handleQuizUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;