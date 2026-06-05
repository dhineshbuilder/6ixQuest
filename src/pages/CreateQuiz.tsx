import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Question } from '../types/database';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Trash2, MoveUp, MoveDown, Save, Eye, Wand2, X } from 'lucide-react';
import { generateQuizContent } from '../lib/groq';

const CreateQuiz: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<(Omit<Question, 'id' | 'quiz_id'> & { tempId: string })[]>([
    {
      tempId: 'init-1',
      question_text: '',
      options: ['', ''],
      correct_answer: '',
      order_index: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // AI Generation State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiLoading, setAiLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        tempId: `q-${Date.now()}`,
        question_text: '',
        options: ['', ''],
        correct_answer: '',
        order_index: questions.length
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions.map((q, i) => ({ ...q, order_index: i })));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order_index: i })));
  };

  const updateQuestion = (index: number, field: keyof Omit<Question, 'id' | 'quiz_id'>, value: string | string[]) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    if (questions[questionIndex].options.length >= 5) return;
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (questions[questionIndex].options.length <= 2) return;
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.splice(optionIndex, 1);
    // Clear correct answer if it was the removed option
    if (newQuestions[questionIndex].correct_answer === questions[questionIndex].options[optionIndex]) {
      newQuestions[questionIndex].correct_answer = '';
    }
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const oldValue = newQuestions[questionIndex].options[optionIndex];
    newQuestions[questionIndex].options[optionIndex] = value;

    // Update correct answer if it was the old option value
    if (newQuestions[questionIndex].correct_answer === oldValue) {
      newQuestions[questionIndex].correct_answer = value;
    }
    setQuestions(newQuestions);
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setAiLoading(true);
    try {
      const generatedQuiz = await generateQuizContent(aiTopic, aiCount, aiDifficulty);

      setTitle(generatedQuiz.title);
      setDescription(generatedQuiz.description);

      const newQuestions = generatedQuiz.questions.map((q, index) => ({
        tempId: `ai-q-${Date.now()}-${index}`,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.options[q.correctAnswer],
        order_index: index
      }));

      setQuestions(newQuestions);
      setShowAIModal(false);
    } catch (error) {
      console.error('AI Generation failed:', error);
      alert('Failed to generate quiz with AI. Please check your API key and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const validateForm = () => {
    if (!title?.trim()) {
      alert('Please enter a quiz title');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (!question?.question_text?.trim()) {
        alert(`Please enter text for question ${i + 1}`);
        return false;
      }

      if (question?.options?.some(option => !option?.trim())) {
        alert(`Please fill in all options for question ${i + 1}`);
        return false;
      }

      if (!question?.correct_answer?.trim()) {
        alert(`Please select a correct answer for question ${i + 1}`);
        return false;
      }

      if (!question.options.includes(question.correct_answer)) {
        alert(`The correct answer for question ${i + 1} must be one of the provided options`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: title?.trim() || '',
          description: description?.trim() || null,
          created_by: user.id,
          is_active: true
        } as any)
        .select()
        .single();

      if (quizError || !quiz) throw quizError;

      // Create questions
      const questionsToInsert = questions.map((question) => ({
        quiz_id: (quiz as any).id,
        question_text: question?.question_text?.trim() || '',
        options: question?.options?.map(opt => opt?.trim() || '') || [],
        correct_answer: question?.correct_answer?.trim() || '',
        order_index: question?.order_index || 0
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert as any);

      if (questionsError) throw questionsError;

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Quiz Preview</h1>
            <button
              onClick={() => setPreviewMode(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Edit
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
            {description && (
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">{description}</p>
            )}

            <div className="space-y-8">
              {questions.map((question, index) => (
                <div key={index} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {index + 1}. {question.question_text}
                  </h3>

                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={`preview-question-${index}`}
                          value={option}
                          readOnly
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-gray-900">{option}</span>
                        {option === question.correct_answer && (
                          <span className="ml-auto text-green-600 text-sm font-medium">✓ Correct</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Quiz</h1>
            <p className="text-gray-600 mt-2">Build your quiz manually or generate with AI</p>
          </div>
          <button
            onClick={() => setShowAIModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Wand2 className="h-5 w-5" />
            Generate with AI
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quiz Details</h2>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your quiz title"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Provide instructions or context for your quiz"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 sm:space-y-6">
            {questions.map((question, questionIndex) => (
              <div key={question.tempId} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Question {questionIndex + 1}
                  </h3>
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {questions.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveQuestion(questionIndex, 'up')}
                          disabled={questionIndex === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <MoveUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(questionIndex, 'down')}
                          disabled={questionIndex === questions.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <MoveDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(questionIndex)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      rows={2}
                      value={question.question_text}
                      onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                      className="block w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Enter your question"
                      required
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Answer Options * (Select the correct answer)
                    </label>
                    <div className="space-y-2 sm:space-y-3">
                      {question.options.map((option, optionIndex) => {
                        const isCorrectAnswer = question.correct_answer === option && option?.trim() !== '';
                        return (
                          <div
                            key={optionIndex}
                            className={`flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg transition-colors ${isCorrectAnswer ? 'bg-green-50 border border-green-300' : 'border border-transparent'
                              }`}
                          >
                            <input
                              type="radio"
                              id={`correct-${questionIndex}-${optionIndex}`}
                              name={`correct-answer-question-${questionIndex}`}
                              value={option}
                              checked={isCorrectAnswer}
                              onChange={() => {
                                if (option?.trim() !== '') {
                                  updateQuestion(questionIndex, 'correct_answer', option);
                                }
                              }}
                              disabled={option?.trim() === ''}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 flex-shrink-0 cursor-pointer"
                              title={option?.trim() === '' ? 'Fill in the option first' : 'Select as correct answer'}
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
                              placeholder={`Option ${optionIndex + 1}`}
                              required
                            />
                            {isCorrectAnswer && (
                              <span className="text-green-600 text-sm font-medium flex-shrink-0">✓ Correct</span>
                            )}
                            {question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="p-1 sm:p-2 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                title="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {question.options.length < 5 && (
                      <button
                        type="button"
                        onClick={() => addOption(questionIndex)}
                        className="mt-2 sm:mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Option
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={addQuestion}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto text-sm sm:text-base"
            >
              <Plus className="h-5 w-5" />
              Add Question
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              disabled={!title?.trim() || questions.some(q => !q?.question_text?.trim())}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Eye className="h-5 w-5" />
              Preview Quiz
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>

        {/* AI Generation Modal */}
        {showAIModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAIModal(false)}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                {/* Close Button at top-right */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setShowAIModal(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Wand2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Generate Quiz with AI
                    </h3>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Describe your quiz topic or paste study notes. The AI will generate questions for you.</p>
                    </div>

                    <form onSubmit={handleAIGenerate} className="mt-5 space-y-4">
                      <div>
                        <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700">
                          Topic / Study Notes
                        </label>
                        <textarea
                          id="ai-topic"
                          rows={4}
                          className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                          placeholder="e.g. World History, Python Loops, or paste text..."
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="ai-count" className="block text-sm font-medium text-gray-700">
                            Number of Questions
                          </label>
                          <input
                            type="number"
                            id="ai-count"
                            min={1}
                            value={aiCount}
                            onChange={(e) => setAiCount(Number(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                            placeholder="Enter number of questions"
                          />
                        </div>

                        <div>
                          <label htmlFor="ai-difficulty" className="block text-sm font-medium text-gray-700">
                            Difficulty
                          </label>
                          <select
                            id="ai-difficulty"
                            value={aiDifficulty}
                            onChange={(e) => setAiDifficulty(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={aiLoading}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                          {aiLoading ? (
                            <>
                              <LoadingSpinner size="small" />
                              <span className="ml-2">Generating...</span>
                            </>
                          ) : (
                            'Generate Questions'
                          )}
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setShowAIModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuiz;
