const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const geminiModel = (import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash').replace(/^models\//, '');

export interface AIQuizResponse {
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    questions: {
        questionText: string;
        options: string[];
        correctAnswer: number; // Index of the correct answer
    }[];
}

/**
 * Helper function to generate quiz in chunks for large requests if needed.
 * Although Gemini handles up to 50 questions easily, chunking maintains
 * consistency and extreme high reliability.
 */
const generateQuizInChunks = async (
    topic: string,
    count: number,
    difficulty: string
): Promise<AIQuizResponse> => {
    const CHUNK_SIZE = 20; // Generate max 20 questions per request for optimal quality
    const chunks = Math.ceil(count / CHUNK_SIZE);

    console.log(`Generating ${count} questions in ${chunks} chunk(s) using Gemini...`);

    const allQuestions: AIQuizResponse['questions'] = [];
    let quizTitle = '';
    let quizDescription = '';

    for (let i = 0; i < chunks; i++) {
        const questionsInChunk = Math.min(CHUNK_SIZE, count - allQuestions.length);
        const chunkNumber = i + 1;

        console.log(`Generating chunk ${chunkNumber}/${chunks} (${questionsInChunk} questions)...`);

        const chunkResult = await generateSingleBatch(
            topic,
            questionsInChunk,
            difficulty,
            chunkNumber,
            chunks
        );

        if (i === 0) {
            quizTitle = chunkResult.title;
            quizDescription = chunkResult.description;
        }

        allQuestions.push(...chunkResult.questions);
    }

    return {
        title: quizTitle,
        description: quizDescription,
        difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
        questions: allQuestions.slice(0, count) // Ensure exact count
    };
};

/**
 * Generate a single batch of questions using Google Gemini API
 */
const generateSingleBatch = async (
    topic: string,
    count: number,
    difficulty: string,
    chunkNumber: number = 1,
    totalChunks: number = 1
): Promise<AIQuizResponse> => {
    if (!apiKey || apiKey === 'your_gemini_api_key') {
        throw new Error('Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file or configuration.');
    }

    const systemPrompt = `You are an AI Quiz Generation Engine working inside an existing production web application called "6ixQuest".

Your ONLY responsibility is to generate high-quality quiz data content in strict JSON format that fits into the system database schema.
Do NOT modify, redesign, remove, or interfere with any other features.

INSTRUCTIONS:
1. Topic / Context: The user wants a quiz about: "${topic}"
2. Difficulty: ${difficulty}
   - Easy: Basic recall and simple understanding
   - Medium: Conceptual and application-based
   - Hard: Analytical and multi-step reasoning
3. Questions count: Exactly ${count} questions.
4. Each question must have:
   - questionText: Factually correct, educational, and clear
   - options: 2 to 5 options (exactly 2 for True/False: ["True", "False"])
   - correctAnswer: The 0-based index of the correct option
5. Ensure options are randomized and no patterns exist for correct answers.`;

    const chunkInfo = totalChunks > 1
        ? `\n\nNote: This is batch ${chunkNumber} of ${totalChunks}. Generate unique questions that don't overlap with other batches.`
        : '';

    const userContent = `Generate EXACTLY ${count} ${difficulty} level quiz questions about: ${topic}${chunkInfo}

CRITICAL: You MUST generate EXACTLY ${count} questions in the questions array. No more, no less.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: systemPrompt + '\n\n' + userContent }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 8000,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                title: { type: 'STRING' },
                                description: { type: 'STRING' },
                                difficulty: { 
                                    type: 'STRING',
                                    enum: ['Easy', 'Medium', 'Hard']
                                },
                                questions: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            questionText: { type: 'STRING' },
                                            options: {
                                                type: 'ARRAY',
                                                items: { type: 'STRING' }
                                            },
                                            correctAnswer: { type: 'INTEGER' }
                                        },
                                        required: ['questionText', 'options', 'correctAnswer']
                                    }
                                }
                            },
                            required: ['title', 'description', 'difficulty', 'questions']
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText || 'Unknown error';
            throw new Error(`Gemini API Error: ${errorMessage}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('No content received from Gemini API');
        }

        const result = JSON.parse(text) as AIQuizResponse;
        return result;
    } catch (error) {
        console.error('Gemini API Integration Error:', error);
        throw error;
    }
};

export const generateQuizContent = async (
    topic: string,
    count: number,
    difficulty: string
): Promise<AIQuizResponse> => {
    if (!apiKey || apiKey === 'your_gemini_api_key') {
        throw new Error('Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file or configuration.');
    }

    // For requests > 20 questions, use chunking for optimal prompt attention and quality
    if (count > 20) {
        return generateQuizInChunks(topic, count, difficulty);
    }

    // Otherwise, generate in a single batch
    return generateSingleBatch(topic, count, difficulty);
};
