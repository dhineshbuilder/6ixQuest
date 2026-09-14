import Groq from 'groq-sdk';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

const groq = new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
});

let discoveredWorkingModel: string | null = null;

const STATIC_FALLBACK_MODELS = [
    import.meta.env.VITE_GROQ_MODEL,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
].filter(Boolean) as string[];

/**
 * Fetch available chat models dynamically from the user's Groq account
 */
const getAvailableChatModels = async (): Promise<string[]> => {
    const list: string[] = [];

    if (import.meta.env.VITE_GROQ_MODEL) {
        list.push(import.meta.env.VITE_GROQ_MODEL);
    }
    if (discoveredWorkingModel && !list.includes(discoveredWorkingModel)) {
        list.push(discoveredWorkingModel);
    }

    try {
        const response = await groq.models.list();
        if (response?.data && Array.isArray(response.data)) {
            // Filter out non-chat models (whisper, guard, embeddings)
            const chatModels = response.data
                .map((m) => m.id)
                .filter((id) => {
                    const lower = id.toLowerCase();
                    return (
                        !lower.includes('whisper') &&
                        !lower.includes('guard') &&
                        !lower.includes('embed') &&
                        !lower.includes('tts')
                    );
                });

            for (const modelId of chatModels) {
                if (!list.includes(modelId)) {
                    list.push(modelId);
                }
            }
        }
    } catch (err) {
        console.warn('Could not query dynamic models list from Groq. Falling back to predefined list.', err);
    }

    for (const model of STATIC_FALLBACK_MODELS) {
        if (!list.includes(model)) {
            list.push(model);
        }
    }

    return list;
};

const isModelUnavailableError = (error: any): boolean => {
    if (!error) return false;
    const status = error?.status;
    const code = error?.error?.code || error?.code;
    const message = (error?.error?.message || error?.message || '').toLowerCase();

    return (
        status === 404 ||
        status === 400 ||
        code === 'model_not_found' ||
        code === 'model_decommissioned' ||
        message.includes('does not exist') ||
        message.includes('not found') ||
        message.includes('decommissioned') ||
        message.includes('no longer supported') ||
        message.includes('do not have access')
    );
};

/**
 * Execute chat completion with automated dynamic discovery & fallback across available Groq models.
 */
const createGroqChatCompletion = async (
    params: Omit<Groq.Chat.CompletionCreateParamsNonStreaming, 'model'> & { model?: string }
) => {
    const availableModels = await getAvailableChatModels();
    const modelsToTry = params.model
        ? [params.model, ...availableModels.filter((m) => m !== params.model)]
        : availableModels;

    let lastError: any = null;

    for (const model of modelsToTry) {
        try {
            console.log(`Generating quiz with Groq model: ${model}`);
            const result = await groq.chat.completions.create({
                ...params,
                model,
            });
            discoveredWorkingModel = model;
            return result;
        } catch (error: any) {
            lastError = error;
            if (isModelUnavailableError(error)) {
                console.warn(`Groq model '${model}' is unavailable (${error?.error?.message || error?.message}). Trying next fallback model...`);
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};

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
 * Helper function to generate quiz in chunks for large requests
 * This improves reliability for 50+ question requests
 */
const generateQuizInChunks = async (
    topic: string,
    count: number,
    difficulty: string
): Promise<AIQuizResponse> => {
    const CHUNK_SIZE = 25; // Generate max 25 questions per request
    const chunks = Math.ceil(count / CHUNK_SIZE);

    console.log(`Generating ${count} questions in ${chunks} chunk(s)...`);

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
 * Generate a single batch of questions
 */
const generateSingleBatch = async (
    topic: string,
    count: number,
    difficulty: string,
    chunkNumber: number = 1,
    totalChunks: number = 1
): Promise<AIQuizResponse> => {
    if (!apiKey) {
        throw new Error('Missing Groq API Key. Please add VITE_GROQ_API_KEY to your .env file or configuration.');
    }

    const systemPrompt = `
You are an AI Quiz Generation Engine working inside an existing production web application called "6ixQuest".

IMPORTANT SYSTEM PROTECTION RULES:

You must ONLY generate quiz content.
You must NOT modify, redesign, remove, or interfere with any existing application features, logic, workflows, UI, security rules, or anti-cheating mechanisms.

The platform already contains:

• Manual quiz creation
• Anti-cheating full screen enforcement
• Violation tracking system
• Quiz sharing and activation controls
• Result analytics and export system
• Student single attempt restrictions
• Dashboard management system

You are NOT allowed to change, rewrite, improve, or comment on these features.

Your ONLY responsibility is to generate quiz data content in strict JSON format that fits into the existing system database schema.

-----------------------------------

INPUT SOURCE RULES:

The user may provide:

• Topic
• Natural language request
• Study notes
• Extracted text from uploaded files
• Extracted text from images
• Mixed or incomplete information

You must interpret the input intelligently and generate quiz questions based on it.

If input content is incomplete, safely supplement with general educational knowledge related to the topic.

-----------------------------------

DIFFICULTY CONTROL:

Maintain difficulty level exactly as requested:
Easy → Basic recall and simple understanding  
Medium → Conceptual and application-based  
Hard → Analytical and multi-step reasoning  

-----------------------------------

QUESTION QUALITY RULES:

• Questions must be educational and factually correct
• Avoid duplicate or repetitive questions
• Avoid ambiguous or opinion-based questions
• Use clear student-friendly language
• Ensure balanced answer option difficulty
• Randomize correct answer position
• Avoid patterns in correct answer indexes
• Each question must test understanding, not guessing

-----------------------------------

QUESTION TYPE RULES:

If MCQ:
• Provide 2 to 5 options
• Only ONE correct answer

If True/False:
• Options must be exactly:
  ["True", "False"]
• Correct answer index must be 0 or 1

-----------------------------------

STRICT OUTPUT FORMAT:

Return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown.
Do NOT include additional text.
Do NOT include comments.

The JSON must follow this schema exactly:

{
  "title": "string",
  "description": "string",
  "difficulty": "Easy | Medium | Hard",
  "questions": [
    {
      "questionText": "string",
      "options": ["string"],
      "correctAnswer": number
    }
  ]
}

-----------------------------------

VALIDATION RULES:

• Minimum 1 question must be generated
• Each question must contain minimum 2 options
• Maximum 5 options allowed
• correctAnswer must match valid option index
• Title must reflect quiz topic
• Description must briefly explain quiz purpose

-----------------------------------

SAFETY RULES:

Do not generate:
• Harmful content
• Political bias questions
• Adult or unsafe content
• Personal opinion based questions
• Copyright restricted text copies

-----------------------------------

FINAL INSTRUCTION:

Your output must integrate seamlessly into the existing 6ixQuest system WITHOUT requiring any modification to existing features.

Return ONLY the JSON quiz object.
`;

    const chunkInfo = totalChunks > 1
        ? `\n\nNote: This is batch ${chunkNumber} of ${totalChunks}. Generate unique questions that don't overlap with other batches.`
        : '';

    const userContent = `Generate EXACTLY ${count} ${difficulty} level quiz questions about: ${topic}${chunkInfo}

CRITICAL: You MUST generate EXACTLY ${count} questions. No more, no less.
Count the questions before returning to ensure you have exactly ${count} questions in the array.`;

    const completion = await createGroqChatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No content received from AI');
    }

    return JSON.parse(content) as AIQuizResponse;
};

export const generateQuizContent = async (
    topic: string,
    count: number,
    difficulty: string
): Promise<AIQuizResponse> => {
    if (!apiKey) {
        throw new Error('Missing Groq API Key. Please add VITE_GROQ_API_KEY to your .env file or configuration.');
    }

    // For requests > 25 questions, use chunking strategy for better reliability
    // 25 is the chunk size, so anything larger should be chunked
    if (count > 25) {
        console.log(`Large request detected (${count} questions). Using chunking strategy...`);
        return generateQuizInChunks(topic, count, difficulty);
    }

    // For smaller requests (<= 25), use single batch with STRICT retry logic

    const systemPrompt = `
You are an AI Quiz Generation Engine working inside an existing production web application called "6ixQuest".

IMPORTANT SYSTEM PROTECTION RULES:

You must ONLY generate quiz content.
You must NOT modify, redesign, remove, or interfere with any existing application features, logic, workflows, UI, security rules, or anti-cheating mechanisms.

The platform already contains:

• Manual quiz creation
• Anti-cheating full screen enforcement
• Violation tracking system
• Quiz sharing and activation controls
• Result analytics and export system
• Student single attempt restrictions
• Dashboard management system

You are NOT allowed to change, rewrite, improve, or comment on these features.

Your ONLY responsibility is to generate quiz data content in strict JSON format that fits into the existing system database schema.

-----------------------------------

INPUT SOURCE RULES:

The user may provide:

• Topic
• Natural language request
• Study notes
• Extracted text from uploaded files
• Extracted text from images
• Mixed or incomplete information

You must interpret the input intelligently and generate quiz questions based on it.

If input content is incomplete, safely supplement with general educational knowledge related to the topic.

-----------------------------------

DIFFICULTY CONTROL:

Maintain difficulty level exactly as requested:
Easy → Basic recall and simple understanding  
Medium → Conceptual and application-based  
Hard → Analytical and multi-step reasoning  

-----------------------------------

QUESTION QUALITY RULES:

• Questions must be educational and factually correct
• Avoid duplicate or repetitive questions
• Avoid ambiguous or opinion-based questions
• Use clear student-friendly language
• Ensure balanced answer option difficulty
• Randomize correct answer position
• Avoid patterns in correct answer indexes
• Each question must test understanding, not guessing

-----------------------------------

QUESTION TYPE RULES:

If MCQ:
• Provide 2 to 5 options
• Only ONE correct answer

If True/False:
• Options must be exactly:
  ["True", "False"]
• Correct answer index must be 0 or 1

-----------------------------------

STRICT OUTPUT FORMAT:

Return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown.
Do NOT include additional text.
Do NOT include comments.

The JSON must follow this schema exactly:

{
  "title": "string",
  "description": "string",
  "difficulty": "Easy | Medium | Hard",
  "questions": [
    {
      "questionText": "string",
      "options": ["string"],
      "correctAnswer": number
    }
  ]
}

-----------------------------------

VALIDATION RULES:

• Minimum 1 question must be generated
• Each question must contain minimum 2 options
• Maximum 5 options allowed
• correctAnswer must match valid option index
• Title must reflect quiz topic
• Description must briefly explain quiz purpose

-----------------------------------

SAFETY RULES:

Do not generate:
• Harmful content
• Political bias questions
• Adult or unsafe content
• Personal opinion based questions
• Copyright restricted text copies

-----------------------------------

FINAL INSTRUCTION:

Your output must integrate seamlessly into the existing 6ixQuest system WITHOUT requiring any modification to existing features.

Return ONLY the JSON quiz object.
`;

    const userContent = `Generate EXACTLY ${count} ${difficulty} level quiz questions about: ${topic}

CRITICAL: You MUST generate EXACTLY ${count} questions. No more, no less.
Count the questions before returning to ensure you have exactly ${count} questions in the array.`;

    try {
        const completion = await createGroqChatCompletion({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            temperature: 0.5,
            max_tokens: 8000,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content received from AI');
        }

        const result = JSON.parse(content) as AIQuizResponse;

        // Validate that we got the correct number of questions
        if (result.questions.length < count) {
            console.warn(`AI generated ${result.questions.length} questions instead of ${count}. Fetching missing questions...`);

            const missingCount = count - result.questions.length;

            // Smarter retry: Only ask for the MISSING questions, then append them
            const retryCompletion = await createGroqChatCompletion({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                    {
                        role: 'assistant',
                        content: content
                    },
                    {
                        role: 'user',
                        content: `You generated ${result.questions.length} questions, but I need EXACTLY ${count}. Please generate ${missingCount} MORE unique questions on the same topic to complete the set. Return a JSON object with the "questions" array containing ONLY the ${missingCount} new questions.`
                    },
                ],
                temperature: 0.5,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
            });

            const retryContent = retryCompletion.choices[0]?.message?.content;
            if (retryContent) {
                const retryResult = JSON.parse(retryContent) as AIQuizResponse;
                console.log(`Retry generated ${retryResult.questions.length} additional questions`);

                // Combine the original questions with the new ones
                if (retryResult.questions && Array.isArray(retryResult.questions)) {
                    result.questions = [...result.questions, ...retryResult.questions];

                    // If we somehow got more than needed (unlikely with this prompt but possible), slice it
                    if (result.questions.length > count) {
                        result.questions = result.questions.slice(0, count);
                    }
                }
            }
        }

        return result;
    } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
    }
};
